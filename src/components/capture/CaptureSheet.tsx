"use client";

/**
 * CaptureSheet — bottom sheet for creating new contacts or interactions.
 *
 * Two modes:
 *   "new_contact"  — user enters name + raw note (voice or text) → POST /api/contacts
 *   "add_note"     — user adds a note to an existing contact  → POST /api/interactions
 *
 * Controlled by useUIStore (captureOpen / captureContactId).
 *
 * Phase 1: submit shows a "connect Supabase" toast and closes.
 * Phase 2: real API calls, optimistic updates via useInteractions.
 */

import { useEffect, useReducer, useRef } from "react";
import { X, Mic, Type, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useUIStore } from "@/stores/ui";
import { useContactsStore } from "@/stores/contacts";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { cn } from "@/lib/utils/cn";
import type { InteractionType } from "@/types/interaction";

type InputMode = "voice" | "text";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  mode: InputMode;
  nameInput: string;
  textInput: string;
  sourceContext: string;
  submitStatus: "idle" | "submitting" | "success" | "error";
  submitMessage?: string;
}

type FormAction =
  | { type: "reset"; initialText?: string }
  | { type: "set_mode"; mode: InputMode }
  | { type: "set_name"; value: string }
  | { type: "set_text"; value: string }
  | { type: "set_context"; value: string }
  | { type: "set_submitting" }
  | { type: "set_success"; message: string }
  | { type: "set_error"; message: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "reset":
      return {
        mode: "text",
        nameInput: "",
        textInput: action.initialText ?? "",
        sourceContext: "",
        submitStatus: "idle",
      };
    case "set_mode":
      return { ...state, mode: action.mode };
    case "set_name":
      return { ...state, nameInput: action.value };
    case "set_text":
      return { ...state, textInput: action.value };
    case "set_context":
      return { ...state, sourceContext: action.value };
    case "set_submitting":
      return { ...state, submitStatus: "submitting" };
    case "set_success":
      return { ...state, submitStatus: "success", submitMessage: action.message };
    case "set_error":
      return { ...state, submitStatus: "error", submitMessage: action.message };
  }
}

const INITIAL_FORM: FormState = {
  mode: "text",
  nameInput: "",
  textInput: "",
  sourceContext: "",
  submitStatus: "idle",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CaptureSheet() {
  const { captureOpen, captureContactId, captureInitialText, closeCapture } = useUIStore();
  const { contacts } = useContactsStore();
  const { addToast } = useUIStore();

  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM);

  const voice = useVoiceInput();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Which contact this note is for (set = existing contact, null = new contact)
  const targetContact = captureContactId ? contacts[captureContactId] : null;
  const isNewContact = !captureContactId;

  // Reset form + voice state whenever the sheet transitions open/closed.
  // On close we also need to abort any in-flight recording so the mic
  // indicator turns off and we don't leak the MediaStream.
  useEffect(() => {
    if (captureOpen) {
      dispatch({ type: "reset", initialText: captureInitialText ?? undefined });
      voice.reset();
      setTimeout(() => textareaRef.current?.focus(), 150);
    } else {
      voice.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureOpen, captureInitialText]);

  // When voice transcription completes, populate the text area
  useEffect(() => {
    if (voice.state === "done" && voice.transcript) {
      dispatch({ type: "set_text", value: voice.transcript });
      dispatch({ type: "set_mode", mode: "text" });
    }
  }, [voice.state, voice.transcript]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const content = form.textInput.trim();
    if (!content) return;

    if (!isSupabaseConfigured()) {
      addToast("Connect Supabase to save. Running in demo mode.", "info");
      closeCapture();
      return;
    }

    dispatch({ type: "set_submitting" });

    try {
      if (isNewContact) {
        const name = form.nameInput.trim() || "Unknown contact";
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            raw_content: content,
            type: (form.mode === "voice" ? "voice_memo" : "text_note") as InteractionType,
            source_context: form.sourceContext.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to create contact");
        }

        dispatch({ type: "set_success", message: "Contact added" });
        addToast("Contact created", "success");
      } else {
        const res = await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: captureContactId,
            raw_content: content,
            type: (form.mode === "voice" ? "voice_memo" : "text_note") as InteractionType,
            source_context: form.sourceContext.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to save note");
        }

        dispatch({ type: "set_success", message: "Note saved" });
        addToast("Note saved", "success");
      }

      // Close after brief success feedback
      setTimeout(() => closeCapture(), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      dispatch({ type: "set_error", message: msg });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!captureOpen) return null;

  const isRecording = voice.state === "recording";
  const isTranscribing = voice.state === "transcribing";
  const isSubmitting = form.submitStatus === "submitting";
  const isSuccess = form.submitStatus === "success";
  const canSubmit = form.textInput.trim().length > 0 && !isSubmitting && !isSuccess;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={closeCapture}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isNewContact ? "Add new contact" : `Add note for ${targetContact?.name ?? ""}`}
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface-primary rounded-t-3xl shadow-2xl
                   max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 rounded-full bg-border" />
          <h2 className="text-fg-primary font-semibold text-base">
            {isNewContact ? "New Contact" : `Note for ${targetContact?.name ?? "contact"}`}
          </h2>
          <button
            onClick={closeCapture}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-secondary"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-fg-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-4 min-h-0">
          {/* Contact name (new contact only) */}
          {isNewContact && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="capture-name" className="text-fg-secondary text-xs font-medium uppercase tracking-wide">
                Contact name
              </label>
              <input
                id="capture-name"
                type="text"
                value={form.nameInput}
                onChange={(e) => dispatch({ type: "set_name", value: e.target.value })}
                placeholder="Their name..."
                className="h-11 rounded-xl border border-border bg-surface-secondary px-3 text-fg-primary text-sm
                           placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          )}

          {/* Mode tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => dispatch({ type: "set_mode", mode: "text" })}
              className={cn(
                "flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium transition-colors",
                form.mode === "text"
                  ? "bg-accent text-fg-inverse"
                  : "bg-surface-secondary text-fg-secondary",
              )}
            >
              <Type className="w-3.5 h-3.5" />
              Text
            </button>
            <button
              onClick={() => dispatch({ type: "set_mode", mode: "voice" })}
              className={cn(
                "flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium transition-colors",
                form.mode === "voice"
                  ? "bg-accent text-fg-inverse"
                  : "bg-surface-secondary text-fg-secondary",
              )}
            >
              <Mic className="w-3.5 h-3.5" />
              Voice
            </button>
          </div>

          {/* Text input */}
          {form.mode === "text" && (
            <textarea
              ref={textareaRef}
              value={form.textInput}
              onChange={(e) => dispatch({ type: "set_text", value: e.target.value })}
              placeholder={isNewContact
                ? "Tell me about this person — how you met, what they do, anything notable..."
                : "What happened? What did they say? Any updates..."}
              rows={5}
              className="w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3 text-fg-primary text-sm
                         placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                         resize-none"
            />
          )}

          {/* Voice input */}
          {form.mode === "voice" && (
            <div className="flex flex-col items-center gap-4">
              {/* Transcript preview */}
              {(form.textInput || isTranscribing) && (
                <div className="w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3 min-h-[80px]">
                  {isTranscribing ? (
                    <div className="flex items-center gap-2 text-fg-muted text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Transcribing...
                    </div>
                  ) : (
                    <p className="text-fg-primary text-sm">{form.textInput}</p>
                  )}
                </div>
              )}

              {/* Record button */}
              <button
                onPointerDown={() => void voice.start()}
                onPointerUp={() => void voice.stop()}
                onPointerLeave={() => void voice.stop()}
                disabled={isTranscribing}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all select-none",
                  isRecording
                    ? "bg-red-500 scale-110 shadow-lg shadow-red-500/30"
                    : isTranscribing
                    ? "bg-border"
                    : "bg-accent shadow-lg shadow-accent/30",
                )}
                aria-label={isRecording ? "Release to stop" : "Hold to record"}
              >
                {isTranscribing ? (
                  <Loader2 className="w-8 h-8 text-fg-inverse animate-spin" />
                ) : (
                  <Mic className="w-8 h-8 text-fg-inverse" />
                )}
              </button>

              <p className="text-fg-muted text-xs">
                {isRecording ? "Recording... release to stop" : "Hold to record"}
              </p>

              {voice.error && (
                <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 w-full">
                  {voice.error}
                </p>
              )}
            </div>
          )}

          {/* Source context */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="capture-context" className="text-fg-secondary text-xs font-medium uppercase tracking-wide">
              Where / context
              <span className="text-fg-muted font-normal normal-case ml-1">(optional)</span>
            </label>
            <input
              id="capture-context"
              type="text"
              value={form.sourceContext}
              onChange={(e) => dispatch({ type: "set_context", value: e.target.value })}
              placeholder="e.g. SaaStr Shanghai, cold outbound, LinkedIn DM"
              className="h-10 rounded-xl border border-border bg-surface-secondary px-3 text-fg-primary text-sm
                         placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Error */}
          {form.submitStatus === "error" && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {form.submitMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pb-[calc(21px+env(safe-area-inset-bottom,0px))] pt-3 border-t border-border-light">
          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className={cn(
              "w-full h-12 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
              canSubmit
                ? "bg-accent text-fg-inverse active:scale-[0.98]"
                : "bg-surface-secondary text-fg-muted cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : isSuccess ? (
              <><CheckCircle2 className="w-4 h-4" /> {form.submitMessage}</>
            ) : (
              isNewContact ? "Add Contact" : "Save Note"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
