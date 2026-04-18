/**
 * GET /api/export?format=csv|json
 *
 * Exports all of the current user's contacts as CSV or JSON.
 *
 * CSV columns: name, title, company, email, phone, linkedin_url, location,
 *              stage, importance, deal_value, deal_currency, deal_probability,
 *              expected_close_date, last_interaction_at, next_followup_at,
 *              relationship_score, ai_summary, key_topics, tags, created_at
 *
 * JSON: full contact objects array (all metadata fields).
 *
 * Returns the file as a download attachment.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/types/contact";

const CSV_HEADERS = [
  "name",
  "title",
  "company",
  "email",
  "phone",
  "linkedin_url",
  "location",
  "stage",
  "importance",
  "company_industry",
  "company_size",
  "company_stage",
  "company_hq",
  "deal_value",
  "deal_currency",
  "deal_probability",
  "expected_close_date",
  "last_interaction_at",
  "next_followup_at",
  "followup_reason",
  "relationship_score",
  "ai_summary",
  "suggested_next_step",
  "key_topics",
  "tags",
  "created_at",
] as const;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = Array.isArray(value) ? value.join("; ") : String(value);
  // Wrap in quotes if contains comma, newline, or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(contacts: Contact[]): string {
  const rows: string[] = [CSV_HEADERS.join(",")];

  for (const c of contacts) {
    const row = CSV_HEADERS.map((field) => {
      // CSV_HEADERS is a const tuple of Contact keys, so this cast is safe.
      const value = c[field as keyof Contact];
      return escapeCell(value);
    });
    rows.push(row.join(","));
  }

  return rows.join("\r\n");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  if (!["csv", "json"].includes(format)) {
    return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
  }

  // Fetch all contacts — no pagination for export
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", user.id)
    .order("name");

  if (error) {
    console.error("[export]", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }

  const contacts = (data ?? []) as Contact[];
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `kova-contacts-${timestamp}.${format}`;

  if (format === "json") {
    const body = JSON.stringify({ contacts, exported_at: new Date().toISOString() }, null, 2);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // CSV
  const csv = buildCsv(contacts);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
