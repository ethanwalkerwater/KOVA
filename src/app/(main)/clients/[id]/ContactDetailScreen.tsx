"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Zap, Loader2, Plus, RefreshCw, Globe } from "lucide-react";
import { StatusBar, Avatar, Chip } from "@/components/ui";
import { SectionRenderer } from "@/components/contacts/SectionRenderer";
import { InteractionTimeline } from "@/components/contacts/InteractionTimeline";
import { useContact } from "@/lib/hooks/useContact";
import { useRegenerate } from "@/lib/hooks/useRegenerate";
import { useUIStore } from "@/stores/ui";
import type { Contact } from "@/types/contact";
import type { Section } from "@/types/section";
import { cn } from "@/lib/utils/cn";

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

export function ContactDetailScreen({ id }: Props) {
  const [activeTab, setActiveTab] = useState<"info" | "notes">("info");
  const [enriching, setEnriching] = useState(false);
  const { openCapture } = useUIStore();
  const { addToast } = useUIStore();

  const { contact, loading, error } = useContact(id);
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

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-surface-primary">
        <StatusBar />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 text-fg-muted animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col h-full bg-surface-primary">
        <StatusBar />
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-8">
          <p className="text-fg-primary font-semibold">Contact not found</p>
          {error && <p className="text-fg-muted text-sm text-center">{error}</p>}
          <Link href="/clients" className="text-accent text-sm">
            ← Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  // ── Derive views from sections ─────────────────────────────────────────────

  const infoSections = (contact.sections ?? []).filter((s: Section) =>
    ["profile", "company", "follow-up"].includes(s.slug),
  );
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

      {/* Profile Header */}
      <div className="bg-surface-primary rounded-3xl mx-4 mb-4 p-5 border border-border">
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
          </div>
        </div>
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
              />
            ))
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <div className="pb-8">
          <div className="mx-4 mb-4">
            <InteractionTimeline interactions={contact.interactions ?? []} />
          </div>
          {researchSection && (
            <SectionRenderer
              section={researchSection}
              defaultExpanded={false}
              className="mx-4 mb-3"
            />
          )}
        </div>
      )}
    </div>
  );
}
