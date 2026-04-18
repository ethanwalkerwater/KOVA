"use client";

/**
 * ContactEditSheet — bottom sheet for directly editing contact metadata.
 *
 * Covers identity fields that users should be able to correct without
 * triggering a full AI regeneration. Pipeline fields (stage, importance,
 * next_followup_at) are also included.
 *
 * Phase 1: shows a "connect Supabase" toast (no-op).
 * Phase 2: PATCH /api/contacts/:id → optimistically updates the store.
 */

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { useContactsStore } from "@/stores/contacts";
import { useUIStore } from "@/stores/ui";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { cn } from "@/lib/utils/cn";
import type { Contact, PipelineStage, Importance } from "@/types/contact";

interface Props {
  contact: Contact;
  open: boolean;
  onClose: () => void;
}

type EditableFields = Pick<
  Contact,
  | "name"
  | "title"
  | "company"
  | "email"
  | "phone"
  | "linkedin_url"
  | "location"
  | "stage"
  | "importance"
  | "next_followup_at"
  | "followup_reason"
>;

const STAGE_OPTIONS: { value: PipelineStage; label: string }[] = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "engaged", label: "Engaged" },
  { value: "negotiating", label: "Negotiating" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
  { value: "dormant", label: "Dormant" },
];

const IMPORTANCE_OPTIONS: { value: Importance; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function ContactEditSheet({ contact, open, onClose }: Props) {
  const { upsertContact } = useContactsStore();
  const { addToast } = useUIStore();

  const [fields, setFields] = useState<EditableFields>({
    name: contact.name,
    title: contact.title,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    linkedin_url: contact.linkedin_url,
    location: contact.location,
    stage: contact.stage,
    importance: contact.importance,
    next_followup_at: contact.next_followup_at,
    followup_reason: contact.followup_reason,
  });

  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Re-sync when contact prop changes (e.g. after regeneration)
  useEffect(() => {
    setFields({
      name: contact.name,
      title: contact.title,
      company: contact.company,
      email: contact.email,
      phone: contact.phone,
      linkedin_url: contact.linkedin_url,
      location: contact.location,
      stage: contact.stage,
      importance: contact.importance,
      next_followup_at: contact.next_followup_at,
      followup_reason: contact.followup_reason,
    });
    setStatus("idle");
    setError(null);
  }, [contact]);

  function set<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value || null }));
  }

  async function handleSave() {
    if (!fields.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!isSupabaseConfigured()) {
      addToast("Connect Supabase to save changes", "info");
      onClose();
      return;
    }

    setStatus("saving");
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save");
      }

      const data = (await res.json()) as { contact: Contact };
      // Patch the store — preserve interactions + sections that aren't returned by PATCH
      upsertContact({
        ...contact,
        ...data.contact,
        sections: contact.sections ?? [],
        interactions: contact.interactions ?? [],
      });

      setStatus("success");
      addToast("Contact updated", "success");
      setTimeout(() => onClose(), 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setStatus("error");
      setError(msg);
    }
  }

  if (!open) return null;

  const isSaving = status === "saving";
  const isSuccess = status === "success";

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit contact"
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface-primary rounded-t-3xl shadow-2xl
                   max-h-[92dvh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 rounded-full bg-border" />
          <h2 className="text-fg-primary font-semibold text-base">Edit Contact</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-secondary"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-fg-secondary" />
          </button>
        </div>

        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 min-h-0">
          {/* Identity section */}
          <p className="text-fg-muted text-xs font-medium uppercase tracking-wide pt-1">
            Identity
          </p>

          <Field label="Name *">
            <input
              type="text"
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full name"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Title">
              <input
                type="text"
                value={fields.title ?? ""}
                onChange={(e) => set("title", e.target.value || null)}
                placeholder="VP Sales"
                className={inputCls}
              />
            </Field>
            <Field label="Company">
              <input
                type="text"
                value={fields.company ?? ""}
                onChange={(e) => set("company", e.target.value || null)}
                placeholder="Acme Corp"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={fields.email ?? ""}
                onChange={(e) => set("email", e.target.value || null)}
                placeholder="name@company.com"
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={fields.phone ?? ""}
                onChange={(e) => set("phone", e.target.value || null)}
                placeholder="+86 138 0000 0000"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="LinkedIn URL">
            <input
              type="url"
              value={fields.linkedin_url ?? ""}
              onChange={(e) => set("linkedin_url", e.target.value || null)}
              placeholder="https://linkedin.com/in/..."
              className={inputCls}
            />
          </Field>

          <Field label="Location">
            <input
              type="text"
              value={fields.location ?? ""}
              onChange={(e) => set("location", e.target.value || null)}
              placeholder="Shanghai, China"
              className={inputCls}
            />
          </Field>

          {/* Pipeline section */}
          <p className="text-fg-muted text-xs font-medium uppercase tracking-wide pt-2">
            Pipeline
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select
                value={fields.stage}
                onChange={(e) => set("stage", e.target.value as PipelineStage)}
                className={selectCls}
              >
                {STAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={fields.importance}
                onChange={(e) => set("importance", e.target.value as Importance)}
                className={selectCls}
              >
                {IMPORTANCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Next follow-up">
            <input
              type="date"
              value={fields.next_followup_at ? fields.next_followup_at.slice(0, 10) : ""}
              onChange={(e) =>
                set("next_followup_at", e.target.value ? `${e.target.value}T00:00:00.000Z` : null)
              }
              className={inputCls}
            />
          </Field>

          <Field label="Follow-up reason">
            <input
              type="text"
              value={fields.followup_reason ?? ""}
              onChange={(e) => set("followup_reason", e.target.value || null)}
              placeholder="e.g. Send revised proposal"
              className={inputCls}
            />
          </Field>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pb-[calc(21px+env(safe-area-inset-bottom,0px))] pt-3 border-t border-border-light">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || isSuccess}
            className={cn(
              "w-full h-12 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
              !isSaving && !isSuccess
                ? "bg-accent text-fg-inverse active:scale-[0.98]"
                : "bg-surface-secondary text-fg-muted cursor-not-allowed",
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Saved
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-fg-secondary text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}

const inputCls =
  "h-10 rounded-xl border border-border bg-surface-secondary px-3 text-fg-primary text-sm " +
  "placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-full";

const selectCls =
  "h-10 rounded-xl border border-border bg-surface-secondary px-3 text-fg-primary text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-full";
