/**
 * POST /api/import
 *
 * Imports contacts from a CSV file (multipart/form-data, field name: "file").
 *
 * Accepted columns (case-insensitive, any subset):
 *   name*, title, company, email, phone, linkedin_url, location,
 *   stage, importance, company_industry, company_size, company_stage,
 *   company_hq, deal_value, deal_currency, deal_probability,
 *   expected_close_date, next_followup_at, followup_reason,
 *   notes, ai_summary, tags, key_topics
 *
 * (* = required; row silently skipped if name is blank)
 *
 * Each imported row creates:
 *   1. A contact row (seeded from CSV columns)
 *   2. An "import" interaction containing the raw CSV row as JSON
 *
 * Limits: 500 rows per file, 5 MB max file size.
 * Rate limit: 5 imports per hour per user.
 *
 * Response: { imported, skipped, errors }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import type { PipelineStage, Importance } from "@/types/contact";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 500;

// TODO(rate-limit): replace in-memory Map in @/lib/rate-limiter with a Supabase
// table so the cap holds across serverless instances. Proposed schema:
//   rate_limits(
//     user_id uuid references auth.users(id),
//     endpoint text,
//     bucket timestamptz,
//     count int default 1,
//     unique(user_id, endpoint, bucket)
//   )
// Until then, the in-memory limiter resets per cold start. Cap is raised from
// 5/hr → 20/hr to reduce false-positive blocks on legit users while still
// deterring casual abuse at single-instance granularity.
const IMPORT_RATE_MAX = 20;
const IMPORT_RATE_WINDOW_MS = 60 * 60_000;

// ── Minimal RFC 4180 CSV parser ───────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < normalized.length) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped quote inside quoted cell
        cell += '"';
        i += 2;
      } else if (ch === '"') {
        // End of quoted cell
        inQuotes = false;
        i++;
      } else {
        cell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
        i++;
      } else if (ch === "\n") {
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        cell += ch;
        i++;
      }
    }
  }

  // Flush final cell / row
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);

  if (rows.length < 2) return [];

  // First row is headers
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const result: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const rowData = rows[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (key) obj[key] = (rowData[c] ?? "").trim();
    }
    result.push(obj);
  }

  return result;
}

// ── Column → Contact field mapping ──────────────────────────────────────────

const VALID_STAGES = new Set<string>([
  "new_lead", "contacted", "engaged", "negotiating",
  "closed_won", "closed_lost", "dormant",
]);
const VALID_IMPORTANCE = new Set<string>(["high", "medium", "low"]);

function parseStage(v: string): PipelineStage | undefined {
  const s = v.toLowerCase().trim().replace(/\s+/g, "_");
  return VALID_STAGES.has(s) ? (s as PipelineStage) : undefined;
}

function parseImportance(v: string): Importance | undefined {
  const s = v.toLowerCase().trim();
  return VALID_IMPORTANCE.has(s) ? (s as Importance) : undefined;
}

function parseNumber(v: string): number | undefined {
  const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? undefined : n;
}

function parseDate(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function parseArray(v: string): string[] {
  if (!v) return [];
  return v
    .split(/[;|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit("import", user.id, {
    maxRequests: IMPORT_RATE_MAX,
    windowMs: IMPORT_RATE_WINDOW_MS,
  });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  let csvText: string;
  try {
    // Strip UTF-8 BOM (\uFEFF) that Excel / Numbers / Google Sheets prepend
    // when exporting CSV. Without this, the first header cell reads as
    // "\uFEFFname" and no rows match the column map.
    csvText = (await file.text()).replace(/^\uFEFF/, "");
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });
  }

  // Check that a 'name' column exists
  const hasNameCol = Object.keys(rows[0]).some((k) => k === "name");
  if (!hasNameCol) {
    return NextResponse.json(
      { error: "CSV must have a 'name' column" },
      { status: 400 },
    );
  }

  const workRows = rows.slice(0, MAX_ROWS);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < workRows.length; idx++) {
    const row = workRows[idx];
    const rowNum = idx + 2; // 1-indexed, +1 for header

    const name = row["name"]?.trim();
    if (!name) {
      skipped++;
      continue;
    }

    try {
      // Build contact insert payload
      const contactInsert: Record<string, unknown> = {
        owner_id: user.id,
        name,
      };

      if (row["title"]) contactInsert["title"] = row["title"];
      if (row["company"]) contactInsert["company"] = row["company"];
      if (row["email"]) contactInsert["email"] = row["email"];
      if (row["phone"]) contactInsert["phone"] = row["phone"];
      if (row["linkedin_url"]) contactInsert["linkedin_url"] = row["linkedin_url"];
      if (row["location"]) contactInsert["location"] = row["location"];

      const stage = row["stage"] ? parseStage(row["stage"]) : undefined;
      if (stage) contactInsert["stage"] = stage;

      const importance = row["importance"] ? parseImportance(row["importance"]) : undefined;
      if (importance) contactInsert["importance"] = importance;

      if (row["company_industry"]) contactInsert["company_industry"] = row["company_industry"];
      if (row["company_size"]) contactInsert["company_size"] = row["company_size"];
      if (row["company_stage"]) contactInsert["company_stage"] = row["company_stage"];
      if (row["company_hq"]) contactInsert["company_hq"] = row["company_hq"];

      const dealValue = row["deal_value"] ? parseNumber(row["deal_value"]) : undefined;
      if (dealValue != null) contactInsert["deal_value"] = dealValue;
      if (row["deal_currency"]) contactInsert["deal_currency"] = row["deal_currency"];

      const dealProb = row["deal_probability"] ? parseNumber(row["deal_probability"]) : undefined;
      if (dealProb != null) contactInsert["deal_probability"] = Math.round(Math.min(100, Math.max(0, dealProb)));

      const closeDate = row["expected_close_date"] ? parseDate(row["expected_close_date"]) : undefined;
      if (closeDate) contactInsert["expected_close_date"] = closeDate.slice(0, 10);

      const followupDate = row["next_followup_at"] ? parseDate(row["next_followup_at"]) : undefined;
      if (followupDate) contactInsert["next_followup_at"] = followupDate;
      if (row["followup_reason"]) contactInsert["followup_reason"] = row["followup_reason"];

      if (row["ai_summary"]) contactInsert["ai_summary"] = row["ai_summary"];

      const tags = row["tags"] ? parseArray(row["tags"]) : [];
      if (tags.length) contactInsert["tags"] = tags;

      const keyTopics = row["key_topics"] ? parseArray(row["key_topics"]) : [];
      if (keyTopics.length) contactInsert["key_topics"] = keyTopics;

      // Create contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert(contactInsert)
        .select("id")
        .single();

      if (contactError || !contact) {
        errors.push(`Row ${rowNum} (${name}): ${contactError?.message ?? "Failed to create"}`);
        continue;
      }

      // Build import interaction content from the most useful columns
      const notesContent = row["notes"] ?? row["ai_summary"] ?? row["followup_reason"] ?? "";
      const summaryParts: string[] = [`Imported contact: ${name}`];
      if (row["title"] || row["company"]) {
        summaryParts.push([row["title"], row["company"]].filter(Boolean).join(" at "));
      }
      if (notesContent) summaryParts.push(notesContent);

      const rawContent = summaryParts.join("\n");

      const { error: interactionError } = await supabase.from("interactions").insert({
        contact_id: contact.id,
        owner_id: user.id,
        type: "import",
        raw_content: rawContent,
        ai_generated: false,
      });

      if (interactionError) {
        // Roll back the contact so the append-only invariant holds — no contact
        // should exist without at least one backing interaction. Regeneration
        // on an interaction-less contact would produce empty sections.
        await supabase.from("contacts").delete().eq("id", contact.id);
        errors.push(
          `Row ${rowNum} (${name}): import failed — ${interactionError.message}`,
        );
        continue; // don't count as imported, don't stamp last_interaction_at
      }

      // Stamp last_interaction_at
      await supabase
        .from("contacts")
        .update({ last_interaction_at: new Date().toISOString() })
        .eq("id", contact.id);

      imported++;
    } catch (err) {
      errors.push(
        `Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  const truncated = rows.length > MAX_ROWS;

  return NextResponse.json({
    imported,
    skipped,
    errors: errors.slice(0, 20), // cap error list to 20 entries
    truncated,
    total_rows: rows.length,
  });
}
