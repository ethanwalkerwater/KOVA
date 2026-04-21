"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Plus, Loader2, LayoutList, Table2, ChevronDown, Users, Upload, CloudOff, RefreshCw, AlertCircle } from "lucide-react";
import { StatusBar, SearchBar, Avatar, Chip, FAB, AlphaIndexSidebar } from "@/components/ui";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { useContacts } from "@/lib/hooks/useContacts";
import { useUIStore } from "@/stores/ui";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { formatRelativeTime } from "@/lib/utils/date";
import { resetSyncAttempts } from "@/lib/db/dexie";
import { triggerSync } from "@/lib/hooks/useSyncPending";
import { useContactsStore } from "@/stores/contacts";
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
  const isOnline = useOnlineStatus();

  const handleRetry = useCallback(async () => {
    await resetSyncAttempts(contact.id, "contact");
    const cached = useContactsStore.getState().contacts[contact.id];
    if (cached) {
      useContactsStore.getState().upsertContact({ ...cached, syncFailed: false });
    }
    triggerSync();
  }, [contact.id]);

  // ── Pending sync badge ─────────────────────────────────────────────────────
  const syncBadge = contact.pending ? (
    contact.syncFailed ? (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); void handleRetry(); }}
        className="inline-flex items-center gap-0.5 ml-2 shrink-0 text-red-500 text-xs hover:opacity-80"
        aria-label="Sync failed — tap to retry"
      >
        <AlertCircle className="w-3 h-3" />
        Failed — Retry
      </button>
    ) : !isOnline ? (
      <span className="inline-flex items-center gap-0.5 ml-2 shrink-0 text-fg-muted text-xs">
        <CloudOff className="w-3 h-3" />
        Saved offline
      </span>
    ) : (
      <span className="inline-flex items-center gap-0.5 ml-2 shrink-0 text-fg-muted text-xs">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing
      </span>
    )
  ) : null;

  // ── Card body shared between Link and div variants ─────────────────────────
  const inner = (
    <>
      <Avatar size="sm" name={contact.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-fg-primary text-sm">{contact.name}</span>
          {syncBadge ?? (contact.last_interaction_at ? (
            <span className="text-fg-muted text-xs ml-2 shrink-0" suppressHydrationWarning>
              {formatRelativeTime(contact.last_interaction_at)}
            </span>
          ) : null)}
        </div>
        {(contact.title || contact.company) && (
          <p className="text-fg-secondary text-xs truncate">
            {[contact.title, contact.company].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {stageChip && <Chip label={stageChip.label} variant={stageChip.variant} />}
          {contact.importance === "high" && (
            <span className="w-2 h-2 rounded-full bg-accent-orange shrink-0" aria-label="High priority" />
          )}
          {contact.importance === "medium" && (
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-label="Medium priority" />
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
    </>
  );

  const rowClass = `flex items-center gap-3 px-5 py-3.5 bg-surface-primary${!isLast ? " border-b border-border-light" : ""}`;

  // Failed contacts can't navigate (the id may still be a local stub) — render
  // as a plain div with a Retry button so the user isn't trapped in a dead link.
  if (contact.syncFailed) {
    return <div className={rowClass}>{inner}</div>;
  }

  return (
    <Link href={`/clients/${contact.id}`} className={rowClass}>
      {inner}
    </Link>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns the uppercase first letter for grouping, or "#" for non-alpha names. */
function getGroupLetter(name: string): string {
  const first = name.trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function ClientsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeLetter, setActiveLetter] = useState<string | undefined>();
  const { openCapture, clientsViewMode: viewMode, setClientsViewMode: setViewMode, addToast } =
    useUIStore();

  // Scroll container ref for the contact list
  const scrollRef = useRef<HTMLDivElement>(null);
  // CSV import (empty-state CTA)
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  // Map of letter → section header element for scrolling
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const debouncedSearch = useDebounce(searchQuery, 300);
  const { contacts, loading, searching, error, hasMore, loadingMore, loadMore, total } =
    useContacts({ q: debouncedSearch });
  // Spinner shows the moment user starts typing (before the 300ms debounce fires)
  // and while the fetch is in flight — so there's no silent dead-zone.
  const searchPending = searching || (searchQuery !== debouncedSearch);

  // ── Filter ────────────────────────────────────────────────────────────────
  let filtered = contacts.filter((c) => {
    if (filter === "high") return c.importance === "high";
    if (filter === "engaged") return c.stage === "engaged" || c.stage === "negotiating";
    if (filter === "negotiating") return c.stage === "negotiating";
    return true;
  });

  // Phase 1 only: client-side text search
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

  // ── Alpha mode: no active search + "all" filter → show grouped alphabetically
  // Otherwise: sort by importance then recency (power-user default)
  const alphaMode = viewMode === "list" && !debouncedSearch.trim() && filter === "all";

  const sortedFiltered = useMemo(() => {
    if (alphaMode) {
      return [...filtered].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    }
    return [...filtered].sort((a, b) => {
      if (a.importance === "high" && b.importance !== "high") return -1;
      if (a.importance !== "high" && b.importance === "high") return 1;
      const aTime = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
      const bTime = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [filtered, alphaMode]);

  // Group contacts by letter (only used in alpha mode)
  const grouped = useMemo(() => {
    if (!alphaMode) return null;
    const map = new Map<string, ContactWithRelations[]>();
    for (const c of sortedFiltered) {
      const letter = getGroupLetter(c.name);
      const group = map.get(letter) ?? [];
      group.push(c);
      map.set(letter, group);
    }
    return map;
  }, [sortedFiltered, alphaMode]);

  const availableLetters = useMemo(
    () => (grouped ? Array.from(grouped.keys()) : []),
    [grouped],
  );

  // CSV import handler (mirrors MeScreen pattern so the empty-state CTA works identically)
  const handleImport = useCallback(async (file: File) => {
    if (!isSupabaseConfigured()) {
      addToast("Connect Supabase to import contacts.", "error");
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json() as { imported?: number; skipped?: number; error?: string };
      if (!res.ok) {
        addToast(data.error ?? "Import failed", "error");
        return;
      }
      const importedCount = data.imported ?? 0;
      const skippedCount = data.skipped ?? 0;
      addToast(
        `Imported ${importedCount} contact${importedCount !== 1 ? "s" : ""}${skippedCount > 0 ? ` (${skippedCount} skipped)` : ""}`,
        "success",
      );
    } catch {
      addToast("Import failed — check your CSV and try again.", "error");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }, [addToast]);

  // Scroll to a letter section
  const handleLetterPress = useCallback((letter: string) => {
    setActiveLetter(letter);
    const el = sectionRefs.current.get(letter);
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-fg-muted animate-spin" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center py-12 px-5">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      );
    }
    if (sortedFiltered.length === 0 && debouncedSearch.trim()) {
      return (
        <div className="text-center py-12">
          <p className="text-fg-muted text-sm">No contacts match &quot;{debouncedSearch}&quot;</p>
        </div>
      );
    }
    if (sortedFiltered.length === 0) {
      return (
        <div className="flex flex-col items-center text-center py-16 px-8">
          <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-fg-muted" />
          </div>
          <p className="text-fg-primary font-semibold text-base">Your contacts live here</p>
          <p className="text-fg-muted text-sm mt-1 max-w-xs">
            Capture your first contact on the Home tab — speak, type, or snap a photo.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 mt-5">
            <Link
              href="/home"
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-fg-primary text-fg-inverse text-sm font-semibold"
            >
              Go to Home →
            </Link>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-surface-secondary text-fg-secondary text-sm font-medium border border-border hover:bg-border disabled:opacity-60"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {importing ? "Importing…" : "Import from CSV"}
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
            }}
          />
        </div>
      );
    }
    if (viewMode === "table") {
      return (
        <div className="px-5 py-3">
          <ContactsTable contacts={sortedFiltered} />
        </div>
      );
    }
    if (alphaMode && grouped) {
      return Array.from(grouped.entries()).map(([letter, group]) => (
        <div key={letter}>
          {/* Section header */}
          <div
            ref={(el) => {
              if (el) sectionRefs.current.set(letter, el);
              else sectionRefs.current.delete(letter);
            }}
            className="px-5 py-1.5 bg-surface-secondary border-b border-border-light"
          >
            <span className="text-xs font-semibold text-fg-muted tracking-wider">{letter}</span>
          </div>
          {/* Contacts in this group */}
          {group.map((contact, index) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isLast={index === group.length - 1}
            />
          ))}
        </div>
      ));
    }
    // Flat list (search active or filter applied)
    const showingCountLabel =
      typeof total === "number" && total > 0
        ? `Showing ${sortedFiltered.length} of ${total}`
        : null;
    return (
      <>
        {sortedFiltered.map((contact, index) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            isLast={index === sortedFiltered.length - 1 && !hasMore}
          />
        ))}
        {(hasMore || showingCountLabel) && (
          <div className="flex flex-col items-center gap-2 py-4">
            {showingCountLabel && (
              <p className="text-fg-muted text-xs" aria-live="polite">
                {showingCountLabel}
              </p>
            )}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-surface-secondary text-fg-secondary text-sm font-medium border border-border hover:bg-border disabled:opacity-60"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </>
    );
  };

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
        loading={searchPending}
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

      {/* Contact list / table — with optional alpha sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto transition-opacity duration-200 ${
            searchPending ? "opacity-60 pointer-events-none" : "opacity-100"
          }`}
          aria-busy={searchPending}
        >
          {renderList()}
        </div>

        {/* Alpha index sidebar — only in alpha mode with enough contacts */}
        {alphaMode && availableLetters.length > 3 && (
          <div className="absolute right-0 top-0 bottom-0 w-6 flex items-stretch py-1 z-10">
            <AlphaIndexSidebar
              letters={availableLetters}
              onLetterPress={handleLetterPress}
              activeLetter={activeLetter}
            />
          </div>
        )}
      </div>

      {/* FAB */}
      <FAB onClick={() => openCapture()} />
    </div>
  );
}
