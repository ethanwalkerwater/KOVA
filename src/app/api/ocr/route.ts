/**
 * POST /api/ocr
 *
 * Extracts contact information from an image (business card, LinkedIn screenshot,
 * email signature, etc.) using GPT-4o vision. Returns structured text suitable
 * for creating a `card_scan` or `photo` interaction.
 *
 * Body (multipart/form-data):
 *   image: File | Blob  — the image to analyse
 *   hint?: string       — optional context ("business card", "linkedin screenshot", etc.)
 *
 * Returns:
 *   {
 *     extracted_text: string,   -- raw extracted content (full markdown)
 *     suggested_name: string | null,
 *     suggested_type: "card_scan" | "photo",
 *   }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB — GPT-4o vision hard limit

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

// Map MIME type → base64 data URL prefix
function mimeToPrefix(mime: string): string {
  if (mime.startsWith("image/")) return `data:${mime};base64,`;
  // fallback — browser File API should always provide a valid image MIME
  return "data:image/jpeg;base64,";
}

const CARD_SYSTEM_PROMPT = `You are a precise OCR and contact extraction assistant.
The user will provide an image. Your job is to:
1. Read ALL text visible in the image
2. Extract any contact information present
3. Format your response as clear, structured markdown

For business cards:
- List the person's name, title, company, email, phone, website, address
- Preserve the exact text as shown on the card

For LinkedIn screenshots, email signatures, or any other professional context:
- Extract the person's name, role/title, company, any contact info
- Note the context (e.g., "From LinkedIn profile", "From email signature")

For any image:
- Also note any context clues (industry, event, etc.)

Respond with clean markdown. Start with the contact's name as a heading if present.
Include a brief "Source:" line at the end noting what type of image this is.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: max 20 OCR scans per day per user
  const rl = checkRateLimit("ocr", user.id, { maxRequests: 20, windowMs: 24 * 60 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const imageFile = formData.get("image");
  const hint = (formData.get("hint") as string | null) ?? "";

  if (!imageFile || !(imageFile instanceof Blob)) {
    return NextResponse.json({ error: "image field is required" }, { status: 400 });
  }

  if (imageFile.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)` },
      { status: 413 },
    );
  }

  // H4: reject non-image MIME types before burning an OpenAI call
  const mime = imageFile.type || "image/jpeg";
  if (!mime.startsWith("image/")) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mime}. Only image/* is accepted.` },
      { status: 415 },
    );
  }
  const arrayBuffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `${mimeToPrefix(mime)}${base64}`;

  const userPrompt = hint
    ? `Please extract all contact information from this image. Context: ${hint}`
    : "Please extract all contact information from this image.";

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      stream: false,
      messages: [
        { role: "system", content: CARD_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const extractedText = completion.choices[0].message.content ?? "";

    // Guess the interaction type: business card → card_scan, else photo
    const lowerHint = hint.toLowerCase();
    const suggestedType: "card_scan" | "photo" =
      lowerHint.includes("card") || lowerHint.includes("name card")
        ? "card_scan"
        : "photo";

    // Best-effort: extract a name from the FIRST h1 heading only.
    // Use /^#\s+/ anchored to the very start of the string (before any body
    // content that might also have h1 headings like "# Sales Highlights").
    const nameMatch = extractedText.match(/^#\s+(.+)/);
    const suggestedName = nameMatch ? nameMatch[1].trim() : null;

    return NextResponse.json({
      extracted_text: extractedText,
      suggested_name: suggestedName,
      suggested_type: suggestedType,
    });
  } catch (err) {
    console.error("[ocr]", err);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
