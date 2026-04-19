"use client";

/**
 * ContactEditSheet — bottom sheet for directly editing contact metadata.
 *
 * Covers identity fields that users should be able to correct without
 * triggering a full AI regeneration. Pipeline fields (stage, importance,
 * next_followup_at) are also included.
 *
 * Also handles contact deletion (with inline confirmation).
 *
 * Phase 1: shows a "connect Supabase" toast (no-op).
 * Phase 2: PATCH /api/contacts/:id → optimistically updates the store.
 *          DELETE /api/contacts/:id → removes from store, calls onDelete.
 */

import { useState, useEffect, useRef } from "react";
import { X, Loader2, CheckCircle2, Trash2, Plus, Tag } from "lucide-react";
import { useContactsStore } from "@/stores/contacts";
import { useUIStore } from "@/stores/ui";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { cn } from "@/lib/utils/cn";
import type { Contact, PipelineStage, Importance } from "@/types/contact";

interface Props {
  contact: Contact;
  open: boolean;
  onClose: () => void;
  /** Called after a successful delete so the parent can navigate away. */
  onDelete?: () => void;
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

export function ContactEditSheet({ contact, open, onClose, onDelete }: Props) {
  const { upsertContact, removeContact } = useContactsStore();
  const { addToast } = useUIStore();

  const [fields, setFields] = useState<EditableFields>(fieldsFrom(contact));
  const [tags, setTags] = useState<string[]>(contact.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Re-sync when contact prop changes (e.g. after regeneration)
  useEffect(() => {
    setFields(fieldsFrom(contact));
    setTags(contact.tags ?? []);
    setStatus("idle");
    setError(null);
    setConfirmDelete(false);
    setTagInput("");
  }, [contact]);

  function setField<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value || null }));
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) return;
    setTags((prev) => [...prev, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

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
        body: JSON.stringify({ ...fields, tags }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save");
      }

      const data = (await res.json()) as { contact: Contact };
      upsertContact({
        ...contact,
        ...data.contact,
        tags: data.contact.tags ?? tags,
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

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!isSupabaseConfigured()) {
      addToast("Connect Supabase to delete contacts", "info");
      onClose();
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      removeContact(contact.id);
      addToast(`${contact.name} deleted`, "success");
      onClose();
      onDelete?.();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Delete failed", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!open) return null;

  const isSaving = status === "saving";
  const isSuccess = status === "success";
  const isBlocked = isSaving || isSuccess || deleting;

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
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Full name"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Title">
              <input
                type="text"
                value={fields.title ?? ""}
                onChange={(e) => setField("title", e.target.value || null)}
                placeholder="VP Sales"
                className={inputCls}
              />
            </Field>
            <Field label="Company">
              <input
                type="text"
                value={fields.company ?? ""}
                onChange={(e) => setField("company", e.target.value || null)}
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
                onChange={(e) => setField("email", e.target.value || null)}
                placeholder="name@company.com"
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={fields.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value || null)}
                placeholder="+86 138 0000 0000"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="LinkedIn URL">
            <input
              type="url"
              value={fields.linkedin_url ?? ""}
              onChange={(e) => setField("linkedin_url", e.target.value || null)}
              placeholder="https://linkedin.com/in/..."
              className={inputCls}
            />
          </Field>

          <Field label="Location">
            <input
              type="text"
              value={fields.location ?? ""}
              onChange={(e) => setField("location", e.target.value || null)}
              placeholder="Shanghai, China"
              className={inputCls}
            />
          </Field>

          {/* Tags section */}
          <p className="text-fg-muted text-xs font-medium uppercase tracking-wide pt-2">
            Tags
          </p>

          <Field label="Tags">
            {/* Chip display + inline input */}
            <div
              className={cn(
                "min-h-10 rounded-xl border border-border bg-surface-secondary px-3 py-2",
                "flex flex-wrap gap-1.5 cursor-text",
              )}
              onClick={() => tagInputRef.current?.focus()}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-accent-light text-accent text-xs font-medium rounded-full px-2.5 py-0.5"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                    className="ml-0.5 hover:text-accent/60"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                placeholder={tags.length === 0 ? "Add tags (Enter to confirm)" : ""}
                className="flex-1 min-w-[120px] bg-transparent text-fg-primary text-sm placeholder:text-fg-muted focus:outline-none"
              />
              {tagInput.trim() && (
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="text-accent"
                  aria-label="Add tag"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </Field>

          {/* Pipeline section */}
          <p className="text-fg-muted text-xs font-medium uppercase tracking-wide pt-2">
            Pipeline
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select
                value={fields.stage}
                onChange={(e) => setField("stage", e.target.value as PipelineStage)}
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
                onChange={(e) => setField("importance", e.target.value as Importance)}
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
                setField("next_followup_at", e.target.value ? `${e.target.value}T00:00:00.000Z` : null)
              }
              className={inputCls}
            />
          </Field>

          <Field label="Follow-up reason">
            <input
              type="text"
              value={fields.followup_reason ?? ""}
              onChange={(e) => setField("followup_reason", e.target.value || null)}
              placeholder="e.g. Send revised proposal"
              className={inputCls}
            />
          </Field>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Delete zone */}
          <div className="pt-2 pb-2">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isBlocked}
                className="flex items-center gap-2 text-red-500 text-sm font-medium disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                Delete Contact
              </button>
            ) : (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-red-700 text-sm font-medium mb-3">
                  Delete {contact.name}? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="flex-1 h-9 rounded-xl bg-red-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {deleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="flex-1 h-9 rounded-xl bg-surface-secondary text-fg-secondary text-sm font-medium disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pb-[calc(21px+env(safe-area-inset-bottom,0px))] pt-3 border-t border-border-light">
          <button
            onClick={() => void handleSave()}
            disabled={isBlocked}
            className={cn(
              "w-full h-12 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
              !isBlocked
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

function fieldsFrom(contact: Contact): EditableFields {
  return {
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
  };
}

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
