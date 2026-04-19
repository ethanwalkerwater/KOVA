/**
 * POST /api/transcribe
 *
 * Receives a multipart/form-data audio file and transcribes it via OpenAI Whisper.
 *
 * Body (multipart): audio file (webm/ogg/mp4/wav/m4a)
 * Returns: { text: string }
 *
 * Used as the fallback for browsers that don't support Web Speech API (iOS Safari, Firefox).
 * Max audio duration: ~25MB (Whisper API limit).
 */

import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB (Whisper limit)

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: max 30 Whisper transcriptions per hour per user
  const rl = checkRateLimit("transcribe", user.id, { maxRequests: 30, windowMs: 60 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  // OpenAI key check
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }

  if (audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: `Audio file too large (max ${MAX_AUDIO_BYTES / 1024 / 1024}MB)` },
      { status: 413 },
    );
  }

  // Call Whisper
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
    });

    return NextResponse.json({ text: transcription });
  } catch (err) {
    console.error("[transcribe] Whisper API error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}
