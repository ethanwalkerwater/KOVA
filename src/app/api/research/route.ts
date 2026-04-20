/**
 * POST /api/research
 *
 * Searches the web for information about a contact and saves the results
 * as an `ai_research` interaction. Triggers Tier 1 regeneration which
 * populates company intelligence metadata and the research section.
 *
 * Body: {
 *   contact_id: string,
 *   name: string,           -- contact name to search for
 *   company?: string,       -- narrows search to company context
 *   custom_query?: string,  -- optional override search query
 * }
 *
 * Returns: {
 *   interaction: Interaction,
 *   summary: string,        -- brief summary of what was found
 * }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import {
  WEB_RESEARCH_SYSTEM_PROMPT,
  buildWebResearchPrompt,
} from "@/lib/ai/prompts";
import { runTier1 } from "@/lib/ai/regenerate";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import type { Interaction } from "@/types/interaction";

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: max 10 web-research calls per hour per user
  const rl = checkRateLimit("research", user.id, { maxRequests: 10, windowMs: 60 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  let body: {
    contact_id?: string;
    name?: string;
    company?: string;
    custom_query?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contact_id, name, company, custom_query } = body;

  if (!contact_id || !name?.trim()) {
    return NextResponse.json({ error: "contact_id and name are required" }, { status: 400 });
  }

  // Verify contact ownership
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, name, company")
    .eq("id", contact_id)
    .eq("owner_id", user.id)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  const searchQuery =
    custom_query?.trim() ??
    `${name.trim()}${company ? ` ${company.trim()}` : ""} professional background LinkedIn`;

  // ── Perform web search via OpenAI web_search_preview tool ─────────────────

  let rawSearchResults = "";
  let synthesizedNote = "";

  try {
    const openai = getOpenAI();

    // Use gpt-4o-mini with web search tool for cost efficiency
    const searchModel = process.env.OPENAI_MODEL_FALLBACK ?? "gpt-4o-mini";

    // First: web search to get raw results.
    // `stream: false` is explicit so TypeScript narrows to ChatCompletion.
    const searchCompletion = await openai.chat.completions.create({
      model: searchModel,
      stream: false,
      // web_search_preview is an OpenAI Responses API tool, not a standard
      // ChatCompletions function type — assert to satisfy the SDK types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_preview" }] as any,
      tool_choice: "auto",
      messages: [
        {
          role: "user",
          content: `Search for professional information about: ${searchQuery}. Focus on their role, company, recent activity, and anything useful for a B2B sales context.`,
        },
      ],
    });

    // Extract text content from the search response
    const searchMessage = searchCompletion.choices[0].message;
    rawSearchResults = searchMessage.content ?? "";

    // If no content yet (tool call pending), get the result
    if (!rawSearchResults && searchMessage.tool_calls?.length) {
      // OpenAI's web search tool returns results inline in a follow-up response
      rawSearchResults = `Search performed for: ${searchQuery} (results integrated below)`;
    }

    // Second: synthesize the search results into a structured note.
    // `stream: false` so TypeScript narrows to ChatCompletion.
    const synthesisCompletion = await openai.chat.completions.create({
      model: searchModel,
      stream: false,
      messages: [
        { role: "system", content: WEB_RESEARCH_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildWebResearchPrompt(
            name.trim(),
            company ?? null,
            rawSearchResults || `Search query: ${searchQuery}\n\nLimited results available.`,
          ),
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    synthesizedNote = synthesisCompletion.choices[0].message.content ?? "";
  } catch (err) {
    console.error("[research] OpenAI call failed:", err);
    // Fall back to a simple note if AI fails
    synthesizedNote = `## Research Note\n\nAutomated web search for ${name}${company ? ` at ${company}` : ""}.\n\n_Search failed — add notes manually._`;
  }

  if (!synthesizedNote.trim()) {
    synthesizedNote = `## About ${name}\n\nNo information found from web search. Try adding notes manually.`;
  }

  // ── Save as ai_research interaction ──────────────────────────────────────────

  const { data: inserted, error: insertError } = await supabase
    .from("interactions")
    .insert({
      contact_id,
      owner_id: user.id,
      type: "ai_research",
      raw_content: synthesizedNote,
      source_context: `Web search: ${searchQuery}`,
      ai_generated: true,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    console.error("[research] Failed to save interaction:", insertError);
    return NextResponse.json({ error: "Failed to save research" }, { status: 500 });
  }

  const interaction = inserted as Interaction;

  // ── Stamp last_interaction_at + trigger Tier 1 ───────────────────────────────

  await supabase
    .from("contacts")
    .update({ last_interaction_at: interaction.created_at })
    .eq("id", contact_id);

  try {
    await runTier1(interaction);
  } catch (err) {
    console.warn("[research] Tier 1 failed (non-fatal):", err);
  }

  // Summarize for the response
  const summary = synthesizedNote.split("\n").find((l) => l.trim() && !l.startsWith("#")) ?? "Research saved.";

  return NextResponse.json({ interaction, summary });
}
