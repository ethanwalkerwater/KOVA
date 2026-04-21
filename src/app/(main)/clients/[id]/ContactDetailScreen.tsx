"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Zap, Loader2, Plus, RefreshCw, Globe, Pencil,
  Mail, Phone, ExternalLink, MapPin, Copy, Check, X,
} from "lucide-react";
import { StatusBar, Avatar, Chip } from "@/components/ui";
import { SectionRenderer } from "@/components/contacts/SectionRenderer";
import { InteractionTimeline } from "@/components/contacts/InteractionTimeline";
import { ContactEditSheet } from "@/components/contacts/ContactEditSheet";
import { useContact } from "@/lib/hooks/useContact";
import { useRegenerate } from "@/lib/hooks/useRegenerate";
import { useUIStore } from "@/stores/ui";
import { useContactsStore } from "@/stores/contacts";
import type { Contact } from "@/types/contact";
import type { Section } from "@/types/section";
import { cn } from "@/lib/utils/cn";
import { isLocalId } from "@/lib/db/dexie";

interface Props {
  id: string;
}

function getStageLabel(stage: Contact["stage"]): string {
  switch (stage) {
    case "new_lead":
      return "New Lead";
    case "contacted":
      return "Contacted";
    case "engaged":
      return "Engaged";
    case "negotiating":
      return "Negotiating";
    case "closed_won":
      return "Closed Won";
    case "closed_lost":
      return "Closed Lost";
    case "dormant":
      return "Dormant";
    default:
      return stage;
  }
}

function getStageChipVariant(stage: Contact["stage"]): Parameters<typeof Chip>[0]["variant"] {
  switch (stage) {
    case "new_lead":
      return "new-lead";
    case "engaged":
      return "engaged";
    case "negotiating":
      return "negotiating";
    case "closed_won":
    case "closed_lost":
      return "closed";
    case "dormant":
      return "dormant";
    default:
      return "default";
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-accent-green-light text-accent-green";
  if (score >= 60) return "bg-accent-light text-accent";
  return "bg-surface-secondary text-fg-secondary";
}

function formatDealValue(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
    notation: value >= 1_000_000 ? "compact" : "standard",
  }).format(value);
}

export function ContactDetailScreen({ id }: Props) {
  const [activeTab, setActiveTab] = useState<"info" | "notes">("info");
  const [enriching, setEnriching] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Section edit state
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const router = useRouter();

  const copyToClipboard = useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }, []);
  const { openCapture } = useUIStore();
  const { addToast } = useUIStore();
  const { upsertSection } = useContactsStore();

  const { contact, loading, error, errorKind, refetch } = useContact(id);
  const { regenerating, trigger: regenerate } = useRegenerate(id);

  async function handleEnrich() {
    if (!contact) return;
    setEnriching(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contact.id,
          name: contact.name,
          company: contact.company ?? undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Enrichment failed");
      }
      addToast("Research saved — regenerating profile...", "success");
      // Trigger full regeneration so research section gets rebuilt
      await regenerate();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Enrichment failed", "error");
    } finally {
      setEnriching(false);
    }
  }

  // ── Section edit / restore ─────────────────────────────────────────────────

  function handleEditSection(section: Section) {
    setEditingSection(section);
    setEditContent(section.user_overrides_md ?? section.content_md);
    setEditReason("");
  }

  async function handleSaveEdit() {
    if (!editingSection || !contact) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/sections/${editingSection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_overrides_md: editContent.trim() || null,
          override_reason: editReason.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
      const data = (await res.json()) as { section: Section };
      upsertSection(contact.id, data.section);
      addToast("Section updated", "success");
      setEditingSection(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleRestoreSection(section: Section) {
    if (!contact) return;
    try {
      const res = await fetch(`/api/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_overrides_md: null, override_reason: null }),
      });
      if (!res.ok) throw new Error("Restore failed");
      const data = (await res.json()) as { section: Section };
      upsertSection(contact.id, data.section);
      addToast("Restored AI version", "success");
    } catch {
      addToast("Restore failed", "error");
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-surface-primary">
        <StatusBar />

        {/* Back button row */}
        <div className="flex items-center px-3 py-2">
          <Link href="/clients" className="w-9 h-9 flex items-center justify-center rounded-full">
            <ChevronLeft className="w-5 h-5 text-fg-primary" />
          </Link>
        </div>

        {/* Skeleton that mirrors the real layout so the page doesn't reflow
            once data lands. Uses bg-surface-secondary blocks with a subtle
            pulse — cheaper than a spinner, preserves perceived structure. */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 animate-pulse">
          {/* Header: avatar + name + title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-surface-secondary" />
            <div className="flex-1">
              <div className="h-5 w-40 bg-surface-secondary rounded mb-2" />
              <div className="h-3.5 w-56 bg-surface-secondary rounded" />
            </div>
          </div>

          {/* Stage chip */}
          <div className="h-6 w-24 bg-surface-secondary rounded-full mb-5" />

          {/* AI insights card */}
          <div className="bg-surface-secondary rounded-2xl h-32 mb-4" />

          {/* Tab switcher */}
          <div className="flex gap-2 mb-4">
            <div className="h-8 w-16 bg-surface-secondary rounded-lg" />
            <div className="h-8 w-16 bg-surface-secondary rounded-lg" />
          </div>

          {/* Section cards */}
          <div className="bg-surface-secondary rounded-2xl h-24 mb-3" />
          <div className="bg-surface-secondary rounded-2xl h-24 mb-3" />
          <div className="bg-surface-secondary rounded-2xl h-24" />
        </div>
      </div>
    );
  }

  if (error || !contact) {
    // Render differentiated empty-states so the user knows whether the contact
    // is actually missing (hard stop), the server is misbehaving (retryable),
    // or they're simply offline (reconnect).
    const kind = errorKind ?? (contact ? null : "not_found");
    const copy =
      kind === "offline"
        ? {
            title: "You're offline",
            body: "Reconnect to load this contact. Any notes you add offline will sync when you're back online.",
            showRetry: false,
          }
        : kind === "server_error"
          ? {
              title: "Something went wrong",
              body: error ?? "The server didn't respond as expected. Give it another try.",
              showRetry: true,
            }
          : {
              title: "Contact not found",
              body: error ?? "This contact may have been deleted or the link is wrong.",
              showRetry: false,
            };

    return (
      <div className="flex flex-col h-full bg-surface-primary">
        <StatusBar />
        <div className="flex items-center px-3 py-2">
          <Link href="/clients" className="w-9 h-9 flex items-center justify-center rounded-full">
            <ChevronLeft className="w-5 h-5 text-fg-primary" />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-8">
          <p className="text-fg-primary font-semibold">{copy.title}</p>
          <p className="text-fg-muted text-sm text-center max-w-xs">{copy.body}</p>
          {copy.showRetry && (
            <button
              onClick={() => void refetch()}
              className="h-10 px-5 rounded-xl bg-accent text-fg-inverse text-sm font-semibold active:scale-[0.98]"
            >
              Retry
            </button>
          )}
          <Link href="/clients" className="text-accent text-sm">
            ← Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  // ── Derive views from sections ─────────────────────────────────────────────

  const INFO_SLUG_ORDER = ["profile", "company", "follow-up"];
  const infoSections = INFO_SLUG_ORDER.flatMap(
    (slug) => (contact.sections ?? []).filter((s: Section) => s.slug === slug),
  );
  const outreachSection = (contact.sections ?? []).find((s: Section) => s.slug === "outreach");
  const researchSection = (contact.sections ?? []).find((s: Section) => s.slug === "research");

  const score = contact.relationship_score ?? 0;

  return (
    <div className="flex flex-col h-full bg-surface-primary overflow-y-auto">
      <StatusBar />

      {/* Top nav row */}
      <div className="flex items-center justify-between px-5 py-3">
        <Link href="/clients" className="flex items-center text-accent text-sm font-medium gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <span className="text-fg-primary font-semibold text-sm">Contact</span>
        <div className="flex items-center gap-2">
          {/* Edit contact */}
          <button
            onClick={() => setEditOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-secondary"
            aria-label="Edit contact"
            title="Edit contact"
          >
            <Pencil className="w-4 h-4 text-fg-secondary" />
          </button>
          {/* Regenerate AI profile */}
          <button
            onClick={() => void regenerate()}
            disabled={regenerating}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-secondary disabled:opacity-50"
            aria-label="Regenerate AI profile"
            title="Regenerate AI profile"
          >
            <RefreshCw className={cn("w-4 h-4 text-fg-secondary", regenerating && "animate-spin")} />
          </button>
          {/* Add note */}
          <button
            onClick={() => openCapture(contact.id)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-secondary"
            aria-label="Add note"
          >
            <Plus className="w-4 h-4 text-fg-secondary" />
          </button>
        </div>
      </div>

      {/* Pending banner — shown while contact awaits server sync */}
      {isLocalId(contact.id) && (
        <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-amber-700 text-xs">
            Syncing to server — AI profile will be generated once online.
          </p>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-surface-primary rounded-3xl mx-4 mb-4 p-5 border border-border">
        {/* Top: avatar + name/title + stage chips */}
        <div className="flex items-start gap-4">
          <Avatar name={contact.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-fg-primary font-bold text-xl leading-tight">{contact.name}</h1>
            {(contact.title || contact.company) && (
              <p className="text-fg-secondary text-sm mt-0.5">
                {[contact.title, contact.company].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Chip
                label={getStageLabel(contact.stage)}
                variant={getStageChipVariant(contact.stage)}
              />
              {contact.importance === "high" && <Chip label="High Intent" variant="high-intent" />}
              {contact.importance === "medium" && <Chip label="Medium" variant="connected" />}
            </div>
            {/* Deal tracking */}
            {contact.deal_value !== null && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-fg-primary text-sm font-semibold">
                  {formatDealValue(contact.deal_value, contact.deal_currency)}
                </span>
                {contact.deal_probability !== null && (
                  <span className="text-fg-muted text-xs">· {contact.deal_probability}% likely</span>
                )}
                {contact.expected_close_date && (
                  <span className="text-fg-muted text-xs">
                    · Close {contact.expected_close_date.slice(0, 10)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact info rows */}
        {(contact.email || contact.phone || contact.linkedin_url || contact.location) && (
          <div className="mt-4 space-y-2 border-t border-border-light pt-4">
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-accent text-sm truncate flex-1 hover:underline"
                >
                  {contact.email}
                </a>
                <button
                  onClick={() => copyToClipboard(contact.email!, "email")}
                  className="shrink-0 text-fg-muted hover:text-fg-primary transition-colors"
                  aria-label="Copy email"
                >
                  {copiedField === "email" ? (
                    <Check className="w-3.5 h-3.5 text-accent-green" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                <a
                  href={`tel:${contact.phone}`}
                  className="text-accent text-sm truncate flex-1 hover:underline"
                >
                  {contact.phone}
                </a>
                <button
                  onClick={() => copyToClipboard(contact.phone!, "phone")}
                  className="shrink-0 text-fg-muted hover:text-fg-primary transition-colors"
                  aria-label="Copy phone"
                >
                  {copiedField === "phone" ? (
                    <Check className="w-3.5 h-3.5 text-accent-green" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            {contact.linkedin_url && (
              <div className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-sm truncate flex-1 hover:underline"
                >
                  {contact.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}
                </a>
                <button
                  onClick={() => copyToClipboard(contact.linkedin_url!, "linkedin")}
                  className="shrink-0 text-fg-muted hover:text-fg-primary transition-colors"
                  aria-label="Copy LinkedIn URL"
                >
                  {copiedField === "linkedin" ? (
                    <Check className="w-3.5 h-3.5 text-accent-green" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            {contact.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                <span className="text-fg-secondary text-sm truncate">{contact.location}</span>
              </div>
            )}
          </div>
        )}

        {/* Follow-up reminder */}
        {contact.next_followup_at && (
          <div className={cn(
            "flex items-center gap-1.5 mt-3 rounded-xl px-3 py-2 border text-xs font-medium",
            new Date(contact.next_followup_at) < new Date()
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-accent-light text-accent border-accent/20",
          )}>
            <span>
              {new Date(contact.next_followup_at) < new Date() ? "⚠ Overdue: " : "Follow-up: "}
            </span>
            <span>{new Date(contact.next_followup_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            {contact.followup_reason && (
              <span className="truncate opacity-80">· {contact.followup_reason}</span>
            )}
          </div>
        )}

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center bg-surface-secondary text-fg-secondary text-xs font-medium rounded-full px-2.5 py-0.5 border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick action bar */}
      <div className="flex items-center gap-2 px-4 mb-4">
        <button
          onClick={() => void handleEnrich()}
          disabled={enriching || regenerating}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-surface-primary border border-border text-fg-secondary text-xs font-medium hover:bg-accent-light hover:text-accent hover:border-accent/30 transition-colors disabled:opacity-50"
        >
          {enriching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
          {enriching ? "Researching..." : "Enrich with AI"}
        </button>
        <button
          onClick={() => openCapture(contact.id)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-surface-primary border border-border text-fg-secondary text-xs font-medium hover:bg-accent-light hover:text-accent hover:border-accent/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add note
        </button>
      </div>

      {/* AI Insights card */}
      {contact.ai_summary && (
        <div className="bg-accent-light rounded-2xl mx-4 mb-4 p-4 border border-accent/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span className="text-accent font-semibold text-sm">AI Insights</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn("text-xs font-bold rounded-full px-2 py-0.5", getScoreColor(score))}
            >
              {score}
            </span>
            <span className="text-fg-secondary text-xs">Stage: {getStageLabel(contact.stage)}</span>
          </div>

          <p className="text-fg-primary text-sm mt-2 leading-relaxed">{contact.ai_summary}</p>

          {contact.key_topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {contact.key_topics.map((topic) => (
                <span key={topic} className="bg-accent text-white text-xs rounded-full px-2 py-0.5">
                  {topic}
                </span>
              ))}
            </div>
          )}

          {contact.suggested_next_step && (
            <p className="text-fg-secondary text-xs italic mt-2">
              → {contact.suggested_next_step}
            </p>
          )}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-border mx-4 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={cn(
            "flex-1 pb-2 text-sm font-medium",
            activeTab === "info"
              ? "border-b-2 border-accent text-accent font-semibold"
              : "text-fg-muted",
          )}
        >
          Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={cn(
            "flex-1 pb-2 text-sm font-medium",
            activeTab === "notes"
              ? "border-b-2 border-accent text-accent font-semibold"
              : "text-fg-muted",
          )}
        >
          Notes
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "info" && (
        <div className="pb-8">
          {infoSections.length === 0 ? (
            <div className="text-center py-8 px-5">
              <p className="text-fg-muted text-sm">No sections generated yet.</p>
              <p className="text-fg-muted text-xs mt-1">
                Add a note to trigger AI profile generation.
              </p>
            </div>
          ) : (
            infoSections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                defaultExpanded={section.slug === "profile"}
                className="mx-4 mb-3"
                onEdit={handleEditSection}
                onRestoreAI={handleRestoreSection}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <div className="pb-8">
          {/* AI-synthesized outreach narrative — sits above the raw log */}
          {outreachSection && (
            <SectionRenderer
              section={outreachSection}
              defaultExpanded={true}
              className="mx-4 mb-3"
              onEdit={handleEditSection}
              onRestoreAI={handleRestoreSection}
            />
          )}
          {/* Raw append-only interaction log */}
          <div className="mx-4 mb-4">
            {(contact.interactions ?? []).length === 0 && !outreachSection ? (
              <p className="text-center text-fg-muted text-sm py-6">No notes yet.</p>
            ) : (
              <InteractionTimeline interactions={contact.interactions ?? []} />
            )}
          </div>
          {/* Web research findings */}
          {researchSection && (
            <SectionRenderer
              section={researchSection}
              defaultExpanded={false}
              className="mx-4 mb-3"
              onEdit={handleEditSection}
              onRestoreAI={handleRestoreSection}
            />
          )}
        </div>
      )}

      {/* Edit contact bottom sheet */}
      <ContactEditSheet
        contact={contact}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onDelete={() => router.replace("/clients")}
      />

      {/* Section edit bottom sheet */}
      {editingSection && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setEditingSection(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${editingSection.title} section`}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-primary rounded-t-3xl shadow-2xl
                       max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-border-light">
              <div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 rounded-full bg-border" />
              <h2 className="text-fg-primary font-semibold text-base">
                Edit {editingSection.title}
              </h2>
              <button
                onClick={() => setEditingSection(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-secondary"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-fg-secondary" />
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-border bg-surface-secondary p-3
                           text-sm text-fg-primary placeholder:text-fg-muted
                           focus:outline-none focus:ring-2 focus:ring-accent resize-y font-mono"
                placeholder="Write markdown content..."
              />
              <div>
                <span className="text-fg-secondary text-xs font-medium">
                  Reason for edit (optional)
                </span>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Corrected company name"
                  className="mt-1 w-full h-10 rounded-xl border border-border bg-surface-secondary px-3
                             text-sm text-fg-primary placeholder:text-fg-muted
                             focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <p className="text-fg-muted text-xs">
                Your edits override the AI version. The original is restored when you regenerate.
              </p>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 pb-[calc(21px+env(safe-area-inset-bottom,0px))] pt-3 border-t border-border-light">
              <button
                onClick={() => void handleSaveEdit()}
                disabled={editSaving}
                className="w-full h-12 rounded-2xl bg-accent text-fg-inverse font-semibold text-sm
                           flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
