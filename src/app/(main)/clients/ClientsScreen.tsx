"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Loader2, LayoutList, Table2 } from "lucide-react";
import { StatusBar, SearchBar, Avatar, Chip, FAB } from "@/components/ui";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { useContacts } from "@/lib/hooks/useContacts";
import { useUIStore } from "@/stores/ui";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { formatRelativeTime } from "@/lib/utils/date";
import type { PipelineStage } from "@/types/contact";
import type { ContactWithRelations } from "@/stores/contacts";

type Filter = "all" | "high" | "engaged" | "negotiating";

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High Priority" },
  { value: "engaged", label: "Engaged" },
  { value: "negotiating", label: "Negotiating" },
];

function getStageChip(
  stage: PipelineStage,
): { variant: Parameters<typeof Chip>[0]["variant"]; label: string } | null {
  switch (stage) {
    case "new_lead":
      return { variant: "new-lead", label: "New Lead" };
    case "contacted":
      return null;
    case "engaged":
      return { variant: "engaged", label: "Engaged" };
    case "negotiating":
      return { variant: "negotiating", label: "Negotiating" };
    case "closed_won":
      return { variant: "closed", label: "Closed" };
    case "closed_lost":
      return { variant: "closed", label: "Lost" };
    case "dormant":
      return { variant: "dormant", label: "Dormant" };
    default:
      return null;
  }
}

interface ContactCardProps {
  contact: ContactWithRelations;
  isLast: boolean;
}

function ContactCard({ contact, isLast }: ContactCardProps) {
  const stageChip = getStageChip(contact.stage);

  return (
    <Link
      href={`/clients/${contact.id}`}
      className={`flex items-center gap-3 px-5 py-3.5 bg-surface-primary${!isLast ? " border-b border-border-light" : ""}`}
    >
      <Avatar size="sm" name={contact.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-fg-primary text-sm">{contact.name}</span>
          {contact.pending ? (
            <span className="inline-flex items-center gap-0.5 ml-2 shrink-0 text-fg-muted text-xs">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </span>
          ) : contact.last_interaction_at ? (
            <span className="text-fg-muted text-xs ml-2 shrink-0" suppressHydrationWarning>
              {formatRelativeTime(contact.last_interaction_at)}
            </span>
          ) : null}
        </div>
        {(contact.title || contact.company) && (
          <p className="text-fg-secondary text-xs truncate">
            {[contact.title, contact.company].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {stageChip && <Chip label={stageChip.label} variant={stageChip.variant} />}
          {contact.importance === "high" && (
            <span
              className="w-2 h-2 rounded-full bg-accent-orange shrink-0"
              aria-label="High priority"
            />
          )}
          {contact.importance === "medium" && (
            <span
              className="w-2 h-2 rounded-full bg-accent shrink-0"
              aria-label="Medium priority"
            />
          )}
          {contact.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs text-fg-muted bg-surface-secondary rounded-full px-2 py-0.5 border border-border-light"
            >
              {tag}
            </span>
          ))}
          {contact.tags.length > 2 && (
            <span className="text-xs text-fg-muted">+{contact.tags.length - 2}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function ClientsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // Default to table view on desktop — togglable
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const { openCapture } = useUIStore();

  // Debounce search query: 300ms delay prevents excessive filtering/API calls while typing
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load contacts — Phase 1: mock data, Phase 2: Supabase via /api/contacts
  // Pass debouncedSearch so Phase 2 server-side search fires after typing pauses
  const { contacts, loading, error } = useContacts({ q: debouncedSearch });

  // Stage/importance filter — always client-side (fast, doesn't need API round-trip)
  // Search: Phase 2 is handled server-side via useContacts({ q: debouncedSearch });
  //         Phase 1 falls back to client-side substring match.
  let filtered = contacts.filter((c) => {
    if (filter === "high") return c.importance === "high";
    if (filter === "engaged") return c.stage === "engaged" || c.stage === "negotiating";
    if (filter === "negotiating") return c.stage === "negotiating";
    return true;
  });

  // Phase 1 only: client-side text search (Phase 2 uses API q param above)
  if (!isSupabaseConfigured() && debouncedSearch.trim()) {
    const q = debouncedSearch.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false) ||
        (c.title?.toLowerCase().includes(q) ?? false) ||
        (c.ai_summary?.toLowerCase().includes(q) ?? false),
    );
  }

  // Sort: high importance first, then by last_interaction_at descending
  filtered = [...filtered].sort((a, b) => {
    if (a.importance === "high" && b.importance !== "high") return -1;
    if (a.importance !== "high" && b.importance === "high") return 1;
    const aTime = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
    const bTime = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="flex flex-col h-full bg-surface-primary">
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <h1 className="text-fg-primary font-bold text-2xl">Clients</h1>
        <div className="flex items-center gap-2">
          {/* View mode toggle — visible on md+ */}
          <div className="hidden md:flex items-center rounded-xl border border-border bg-surface-secondary p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-surface-primary text-fg-primary shadow-sm"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
              aria-label="List view"
              title="List view"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-surface-primary text-fg-primary shadow-sm"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
              aria-label="Table view"
              title="Table view"
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => openCapture()}
            className="w-9 h-9 rounded-full bg-fg-primary flex items-center justify-center"
            aria-label="Add contact"
          >
            <Plus className="w-4 h-4 text-fg-inverse" />
          </button>
        </div>
      </div>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={(value) => setSearchQuery(value)}
        className="mx-5 mb-3"
      />

      {/* Filter chips */}
      <div className="flex overflow-x-auto px-5 mb-3 scrollbar-none">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium mr-2 whitespace-nowrap shrink-0 ${
              filter === option.value
                ? "bg-fg-primary text-fg-inverse"
                : "bg-surface-secondary text-fg-secondary border border-border"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Contact list / table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-fg-muted animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 px-5">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 && debouncedSearch.trim() ? (
          <div className="text-center py-12">
            <p className="text-fg-muted text-sm">No contacts match &quot;{debouncedSearch}&quot;</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-8">
            <p className="text-fg-primary font-semibold text-base">No contacts yet</p>
            <p className="text-fg-muted text-sm mt-1">
              Tap the + button to add your first contact.
            </p>
          </div>
        ) : viewMode === "table" ? (
          /* Desktop table — only reachable when viewMode=table on md+ screens */
          <div className="px-5 py-3">
            <ContactsTable contacts={filtered} />
          </div>
        ) : (
          filtered.map((contact, index) => (
            <ContactCard key={contact.id} contact={contact} isLast={index === filtered.length - 1} />
          ))
        )}
      </div>

      {/* FAB */}
      <FAB onClick={() => openCapture()} />
    </div>
  );
}
