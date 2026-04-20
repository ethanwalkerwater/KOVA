"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, Globe, UserPlus, CheckCircle2 } from "lucide-react";
import { StatusBar, Avatar, Button } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useUIStore } from "@/stores/ui";
import { useContactsStore } from "@/stores/contacts";
import type { LeadProspect } from "@/app/api/leads/route";
import type { Contact } from "@/types/contact";
import type { Interaction } from "@/types/interaction";

// ── Mock leads (Phase 1 fallback) ──────────────────────────────────────────────

const MOCK_LEADS: LeadProspect[] = [
  {
    id: "lead-1",
    name: "Alex Thompson",
    title: "VP Engineering",
    company: "DataSync Pro",
    location: "Singapore",
    summary: "Recently posted about scaling data pipelines. Company doubled headcount in Q1.",
    relevance_score: 88,
    source_url: null,
  },
  {
    id: "lead-2",
    name: "Rachel Kim",
    title: "Head of Procurement",
    company: "ManufactureX",
    location: "Shanghai",
    summary: "Attended same industry conference. Company announced digital transformation initiative.",
    relevance_score: 72,
    source_url: null,
  },
  {
    id: "lead-3",
    name: "Omar Al-Rashid",
    title: "CTO",
    company: "LogiTrack Systems",
    location: "Dubai",
    summary: "Published article on modern logistics infrastructure. CTO evaluating vendor relationships.",
    relevance_score: 65,
    source_url: null,
  },
];

// ── Lead card ─────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: LeadProspect;
  onAdd: (lead: LeadProspect) => Promise<void>;
}

function LeadCard({ lead, onAdd }: LeadCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setAdding(true);
    try {
      await onAdd(lead);
      setAdded(true);
    } finally {
      setAdding(false);
    }
  }

  const relevanceColor =
    lead.relevance_score >= 80
      ? "bg-accent-green-light text-accent-green"
      : lead.relevance_score >= 60
      ? "bg-accent-light text-accent"
      : "bg-surface-secondary text-fg-secondary";

  return (
    <div className="bg-surface-primary rounded-2xl border border-border p-4 mb-3 mx-4">
      {/* Row 1: Avatar + name + title at company */}
      <div className="flex items-center gap-3 mb-2">
        <Avatar name={lead.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-fg-primary font-semibold text-sm leading-tight truncate">{lead.name}</p>
          <p className="text-fg-muted text-xs truncate">
            {[lead.title, lead.company].filter(Boolean).join(" at ")}
          </p>
        </div>
        <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${relevanceColor}`}>
          {lead.relevance_score}%
        </span>
      </div>

      {/* Row 2: Location badge */}
      {lead.location && (
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-surface-secondary rounded-full px-2 py-0.5 text-xs text-fg-secondary">
            📍 {lead.location}
          </span>
        </div>
      )}

      {/* Row 3: Summary */}
      <p className="text-fg-secondary text-sm line-clamp-2 mb-3">{lead.summary}</p>

      {/* Row 4: Source + Add button */}
      <div className="flex items-center justify-between gap-2">
        {lead.source_url ? (
          <a
            href={lead.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-accent text-xs hover:underline"
          >
            <Globe className="w-3 h-3" />
            Source
          </a>
        ) : (
          <span className="text-fg-muted text-xs">AI discovery</span>
        )}
        <button
          onClick={() => void handleAdd()}
          disabled={adding || added}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
            added
              ? "bg-accent-green-light text-accent-green cursor-default"
              : "bg-fg-primary text-fg-inverse hover:bg-fg-secondary"
          } disabled:opacity-70`}
        >
          {adding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : added ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
          {added ? "Added!" : adding ? "Adding..." : "Add to Clients"}
        </button>
      </div>
    </div>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function LeadsScreen() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [leads, setLeads] = useState<LeadProspect[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { addToast } = useUIStore();
  const { upsertContact } = useContactsStore();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setSearching(true);
    setSearchError(null);
    setLeads([]);

    if (!isSupabaseConfigured()) {
      // Phase 1: simulate search delay, return mock results
      await new Promise((r) => setTimeout(r, 1200));
      setLeads(MOCK_LEADS);
      setHasSearched(true);
      setSearching(false);
      return;
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Search failed (${res.status})`);
      }

      const data = (await res.json()) as { leads: LeadProspect[] };
      setLeads(data.leads);
      setHasSearched(true);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleAddToClients = useCallback(
    async (lead: LeadProspect) => {
      if (!isSupabaseConfigured()) {
        addToast("Connect Supabase to save contacts", "info");
        return;
      }

      const rawNote = [
        `Lead discovered via AI search.`,
        lead.title && `Title: ${lead.title}`,
        lead.company && `Company: ${lead.company}`,
        lead.location && `Location: ${lead.location}`,
        `\n${lead.summary}`,
        lead.source_url && `Source: ${lead.source_url}`,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: lead.name,
            raw_content: rawNote,
            type: "ai_research",
            source_context: "Lead discovery",
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to add contact");
        }

        // Update store so the contact appears immediately in Clients
        const data = (await res.json()) as { contact: Contact; interaction: Interaction };
        upsertContact({ ...data.contact, sections: [], interactions: [data.interaction] });

        addToast(`${lead.name} added to Clients`, "success");
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to add", "error");
        throw err; // re-throw so the card can revert its adding state
      }
    },
    [addToast, upsertContact],
  );

  return (
    <div className="flex flex-col">
      <StatusBar />

      {/* Header */}
      <div className="px-5 pt-2 pb-3">
        <h1 className="text-fg-primary font-bold text-2xl">Leads</h1>
        <p className="text-fg-muted text-sm mt-0.5">AI-powered lead discovery</p>
      </div>

      {/* Discovery search */}
      <div className="bg-surface-primary rounded-2xl border border-border p-4 mx-4 mb-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSearch();
            }
          }}
          placeholder="Describe your ideal lead..."
          rows={2}
          className="w-full bg-transparent text-sm text-fg-primary placeholder:text-fg-muted outline-none resize-none mb-1"
        />
        <p className="text-fg-muted text-xs mb-3">
          e.g. VP Engineering at Series B SaaS in Southeast Asia
        </p>
        <Button
          variant="primary"
          className="h-9 px-4 text-sm flex items-center gap-2"
          onClick={() => void handleSearch()}
          disabled={searching || !query.trim()}
        >
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {searchError && (
        <div className="mx-4 mb-4 bg-red-50 rounded-2xl p-4 text-red-600 text-sm">
          {searchError}
        </div>
      )}

      {/* Results */}
      {searching && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="w-7 h-7 text-accent animate-spin" />
          <p className="text-fg-muted text-sm">Searching the web for prospects...</p>
        </div>
      )}

      {!searching && leads.length > 0 && (
        <>
          <p className="text-fg-muted text-xs font-medium uppercase tracking-wide px-5 mb-2">
            {leads.length} prospect{leads.length !== 1 ? "s" : ""} found
          </p>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onAdd={handleAddToClients} />
          ))}
        </>
      )}

      {!searching && hasSearched && leads.length === 0 && !searchError && (
        <div className="mx-4 mb-4 bg-surface-primary rounded-2xl border border-border-light p-8 text-center">
          <Search className="w-8 h-8 text-fg-muted mx-auto mb-2" />
          <p className="text-fg-primary font-medium text-sm">No leads found</p>
          <p className="text-fg-muted text-xs mt-1">Try a different search query.</p>
        </div>
      )}

      {!searching && !hasSearched && (
        <div className="mx-4 mb-4 bg-surface-primary rounded-2xl border border-border-light p-6 text-center">
          <Globe className="w-8 h-8 text-fg-muted mx-auto mb-2" />
          <p className="text-fg-primary font-medium text-sm">Find leads with AI</p>
          <p className="text-fg-muted text-xs mt-1">
            Describe your ideal customer above and AI will search the web for matching prospects
          </p>
        </div>
      )}
    </div>
  );
}
