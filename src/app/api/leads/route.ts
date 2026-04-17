/**
 * POST /api/leads
 *
 * Performs AI-powered lead discovery using web search.
 * Takes a natural-language description of an ideal lead and returns
 * structured prospect data.
 *
 * Body: { query: string }
 *
 * Returns: {
 *   leads: LeadProspect[],
 *   query_used: string,
 * }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { LEAD_DISCOVERY_SYSTEM_PROMPT, buildLeadDiscoveryPrompt } from "@/lib/ai/prompts";

export interface LeadProspect {
  id: string; // client-generated for list keys
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  summary: string;
  relevance_score: number;
  source_url: string | null;
}

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

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body;
  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  const searchQuery = `${query.trim()} professionals LinkedIn prospects`;

  // ── Web search + lead extraction ──────────────────────────────────────────

  let rawSearchResults = "";
  let leads: LeadProspect[] = [];

  try {
    const openai = getOpenAI();
    const model = process.env.OPENAI_MODEL_FALLBACK ?? "gpt-4o-mini";

    // Step 1: Web search
    const searchCompletion = await openai.chat.completions.create({
      model,
      tools: [{ type: "web_search_preview" as "function" }],
      tool_choice: "auto",
      messages: [
        {
          role: "user",
          content: `Find professionals matching this description: ${query.trim()}. Search for real people with their names, titles, companies, and relevant context for B2B sales outreach.`,
        },
      ],
    } as Parameters<typeof openai.chat.completions.create>[0]);

    rawSearchResults = searchCompletion.choices[0].message.content ?? "";

    if (!rawSearchResults) {
      rawSearchResults = `Search query: ${searchQuery}\nSearching for prospects matching: ${query}`;
    }

    // Step 2: Extract structured leads
    const extractionCompletion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: LEAD_DISCOVERY_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildLeadDiscoveryPrompt(query.trim(), rawSearchResults),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1000,
    });

    const raw = extractionCompletion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw) as { leads?: LeadProspect[] };

    leads = (parsed.leads ?? []).map((l, i) => ({
      ...l,
      id: `lead-${Date.now()}-${i}`,
    }));
  } catch (err) {
    console.error("[leads] Discovery failed:", err);
    // Return empty on failure — don't crash
    return NextResponse.json({ leads: [], query_used: searchQuery });
  }

  // Sort by relevance score descending
  leads.sort((a, b) => b.relevance_score - a.relevance_score);

  return NextResponse.json({ leads: leads.slice(0, 10), query_used: searchQuery });
}
