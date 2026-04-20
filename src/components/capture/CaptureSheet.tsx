"use client";

/**
 * CaptureSheet — bottom sheet for creating new contacts or interactions.
 *
 * Three modes:
 *   "text"  — typed note → text_note or voice_memo interaction
 *   "voice" — hold-to-record voice memo → voice_memo interaction
 *   "scan"  — photo / business card → OCR → card_scan or photo interaction
 *
 * Contact scope:
 *   "new_contact"  — creates a new contact + first interaction  → POST /api/contacts
 *   "add_note"     — appends an interaction to an existing contact → POST /api/interactions
 *
 * Controlled by useUIStore (captureOpen / captureContactId / captureInitialText).
 *
 * Phase 1: submit shows a "connect Supabase" toast and closes.
 * Phase 2: real API calls, optimistic updates via useInteractions.
 */

import { useEffect, useReducer, useRef, useCallback } from "react";
import { X, Mic, Type, Loader2, CheckCircle2, AlertCircle, Camera, ScanLine, ImageIcon } from "lucide-react";
import { useUIStore } from "@/stores/ui";
import { useContactsStore } from "@/stores/contacts";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { cn } from "@/lib/utils/cn";
import type { InteractionType } from "@/types/interaction";

type InputMode = "voice" | "text" | "scan";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  mode: InputMode;
  /** True when the textInput was populated by a voice transcription.
   *  Ensures the interaction type stays "voice_memo" even after mode resets
   *  to "text" post-transcription. */
  capturedViaVoice: boolean;
  nameInput: string;
  textInput: string;
  sourceContext: string;
  submitStatus: "idle" | "submitting" | "success" | "error";
  submitMessage?: string;
  // Scan-mode state
  scanImageFile: File | null;
  scanPreviewUrl: string | null;
  scanOcrStatus: "idle" | "processing" | "done" | "error";
  scanOcrError: string | null;
}

type FormAction =
  | { type: "reset"; initialText?: string; initialMode?: InputMode }
  | { type: "set_mode"; mode: InputMode }
  | { type: "set_name"; value: string }
  | { type: "set_text"; value: string }
  | { type: "set_context"; value: string }
  | { type: "set_submitting" }
  | { type: "set_success"; message: string }
  | { type: "set_error"; message: string }
  | { type: "set_scan_image"; file: File; previewUrl: string }
  | { type: "set_scan_processing" }
  | { type: "set_scan_done"; extractedText: string; suggestedName: string | null }
  | { type: "set_scan_error"; error: string }
  | { type: "clear_scan" }
  /** Voice transcription done: switch to text view but remember origin. */
  | { type: "set_voice_transcribed" };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "reset":
      return {
        mode: action.initialMode ?? "text",
        capturedViaVoice: false,
        nameInput: "",
        textInput: action.initialText ?? "",
        sourceContext: "",
        submitStatus: "idle",
        scanImageFile: null,
        scanPreviewUrl: null,
        scanOcrStatus: "idle",
        scanOcrError: null,
      };
    case "set_mode":
      // Switching away from voice clears the capturedViaVoice flag
      return { ...state, mode: action.mode, capturedViaVoice: false };
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
    case "set_scan_image":
      return {
        ...state,
        scanImageFile: action.file,
        scanPreviewUrl: action.previewUrl,
        scanOcrStatus: "idle",
        scanOcrError: null,
        textInput: "",
      };
    case "set_scan_processing":
      return { ...state, scanOcrStatus: "processing", scanOcrError: null };
    case "set_scan_done":
      return {
        ...state,
        scanOcrStatus: "done",
        textInput: action.extractedText,
        // Prefill name if we got one and the field is empty
        nameInput: state.nameInput || action.suggestedName || "",
      };
    case "set_scan_error":
      return { ...state, scanOcrStatus: "error", scanOcrError: action.error };
    case "clear_scan":
      return {
        ...state,
        scanImageFile: null,
        scanPreviewUrl: null,
        scanOcrStatus: "idle",
        scanOcrError: null,
        textInput: "",
      };
    case "set_voice_transcribed":
      // Switch to text view so the textarea renders, but mark that content
      // originated from voice so the interaction saves as "voice_memo".
      return { ...state, mode: "text", capturedViaVoice: true };
  }
}

const INITIAL_FORM: FormState = {
  mode: "text",
  capturedViaVoice: false,
  nameInput: "",
  textInput: "",
  sourceContext: "",
  submitStatus: "idle",
  scanImageFile: null,
  scanPreviewUrl: null,
  scanOcrStatus: "idle",
  scanOcrError: null,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CaptureSheet() {
  const { captureOpen, captureContactId, captureInitialText, captureMode, closeCapture } =
    useUIStore();
  const { contacts, upsertContact, appendInteraction } = useContactsStore();
  const { addToast } = useUIStore();

  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM);

  const voice = useVoiceInput();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Which contact this note is for (set = existing contact, null = new contact)
  const targetContact = captureContactId ? contacts[captureContactId] : null;
  const isNewContact = !captureContactId;

  // Reset form + voice state whenever the sheet transitions open/closed.
  useEffect(() => {
    if (captureOpen) {
      const initialMode: InputMode =
        captureMode === "scan" ? "scan" : "text";
      dispatch({
        type: "reset",
        initialText: captureInitialText ?? undefined,
        initialMode,
      });
      voice.reset();
      if (initialMode === "text") {
        setTimeout(() => textareaRef.current?.focus(), 150);
      }
    } else {
      voice.reset();
      // Revoke any object URLs to prevent memory leaks
      if (form.scanPreviewUrl) {
        URL.revokeObjectURL(form.scanPreviewUrl);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureOpen, captureInitialText, captureMode]);

  // When voice transcription completes, populate the text area.
  // We reset mode to "text" so the textarea renders, but mark capturedViaVoice
  // so the submit path saves as "voice_memo", not "text_note" (M5 fix).
  useEffect(() => {
    if (voice.state === "done" && voice.transcript) {
      dispatch({ type: "set_text", value: voice.transcript });
      // Use set_mode only to show the textarea; capturedViaVoice flag preserved
      // via a direct state patch after — reducer clears capturedViaVoice on
      // set_mode, so we need a separate field-level update below.
      // Simplest: skip set_mode and keep mode="voice"; the textarea renders in both.
      // Instead, use a new dedicated action to avoid the flag being cleared.
      dispatch({ type: "set_voice_transcribed" });
      voice.reset();
    }
  }, [voice.state, voice.transcript]);

  // ── OCR ─────────────────────────────────────────────────────────────────────

  const runOcr = useCallback(async (file: File) => {
    if (!isSupabaseConfigured()) {
      // Phase 1 demo: fake OCR result
      dispatch({ type: "set_scan_processing" });
      await new Promise((r) => setTimeout(r, 1500));
      dispatch({
        type: "set_scan_done",
        extractedText:
          "# Demo Card\n\nThis is a simulated OCR result.\n\n**Name:** John Demo\n**Title:** VP of Sales\n**Company:** Acme Corp\n**Email:** john@acme.com\n**Phone:** +1 555 0100\n\nSource: Business card (demo mode)",
        suggestedName: "John Demo",
      });
      return;
    }

    dispatch({ type: "set_scan_processing" });

    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("hint", "business card or professional photo");

      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "OCR failed");
      }

      const data = (await res.json()) as {
        extracted_text: string;
        suggested_name: string | null;
        suggested_type: "card_scan" | "photo";
      };

      dispatch({
        type: "set_scan_done",
        extractedText: data.extracted_text,
        suggestedName: data.suggested_name,
      });
    } catch (err) {
      dispatch({
        type: "set_scan_error",
        error: err instanceof Error ? err.message : "OCR failed",
      });
    }
  }, []);

  function handleImageSelected(file: File) {
    if (!file.type.startsWith("image/")) {
      addToast("Please select an image file", "error");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    dispatch({ type: "set_scan_image", file, previewUrl });
    void runOcr(file);
  }

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

    // Determine interaction type.
    // capturedViaVoice handles the case where voice transcription finished and
    // mode was reset to "text" for the textarea UI — we still want "voice_memo".
    let interactionType: InteractionType = "text_note";
    if (form.capturedViaVoice || form.mode === "voice") interactionType = "voice_memo";
    else if (form.mode === "scan" && form.scanImageFile) interactionType = "card_scan";

    try {
      if (isNewContact) {
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // If blank, the server will extract name from raw_content via AI
            name: form.nameInput.trim() || undefined,
            raw_content: content,
            type: interactionType,
            source_context: form.sourceContext.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to create contact");
        }

        // Update store so the contact appears immediately in the list
        const data = (await res.json()) as {
          contact: import("@/types/contact").Contact;
          interaction: import("@/types/interaction").Interaction;
        };
        upsertContact({ ...data.contact, sections: [], interactions: [data.interaction] });

        dispatch({ type: "set_success", message: "Contact added" });
        addToast("Contact created", "success");
      } else {
        const res = await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: captureContactId,
            raw_content: content,
            type: interactionType,
            source_context: form.sourceContext.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to save note");
        }

        // Optimistically append the interaction to the contact in the store
        const intData = (await res.json()) as { interaction: import("@/types/interaction").Interaction };
        if (captureContactId && intData.interaction) {
          appendInteraction(captureContactId, intData.interaction);
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
  const isOcrProcessing = form.scanOcrStatus === "processing";

  // Can submit when we have content and aren't busy
  const canSubmit =
    form.textInput.trim().length > 0 &&
    !isSubmitting &&
    !isSuccess &&
    !isOcrProcessing;

  return (
    <>
      {/* Hidden file inputs — one for gallery, one for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelected(file);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelected(file);
          e.target.value = "";
        }}
      />

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
              <label
                htmlFor="capture-name"
                className="text-fg-secondary text-xs font-medium uppercase tracking-wide"
              >
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
              {!form.nameInput.trim() && (
                <p className="text-fg-muted text-xs">
                  Leave blank — AI will extract the name from your note
                </p>
              )}
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
            <button
              onClick={() => dispatch({ type: "set_mode", mode: "scan" })}
              className={cn(
                "flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium transition-colors",
                form.mode === "scan"
                  ? "bg-accent text-fg-inverse"
                  : "bg-surface-secondary text-fg-secondary",
              )}
            >
              <ScanLine className="w-3.5 h-3.5" />
              Scan
            </button>
          </div>

          {/* ── Text mode ─────────────────────────────────────────────────── */}
          {form.mode === "text" && (
            <textarea
              ref={textareaRef}
              value={form.textInput}
              onChange={(e) => dispatch({ type: "set_text", value: e.target.value })}
              placeholder={
                isNewContact
                  ? "Tell me about this person — how you met, what they do, anything notable..."
                  : "What happened? What did they say? Any updates..."
              }
              rows={5}
              className="w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3 text-fg-primary text-sm
                         placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                         resize-none"
            />
          )}

          {/* ── Voice mode ────────────────────────────────────────────────── */}
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

          {/* ── Scan mode ─────────────────────────────────────────────────── */}
          {form.mode === "scan" && (
            <div className="flex flex-col gap-3">
              {!form.scanImageFile ? (
                /* Image picker — two buttons: camera and gallery */
                <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-surface-secondary p-6">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <ScanLine className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-center">
                    <p className="text-fg-primary text-sm font-medium">Scan a business card</p>
                    <p className="text-fg-muted text-xs mt-0.5">
                      or any image with contact info
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-accent text-fg-inverse text-sm font-medium"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Camera
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-surface-primary border border-border text-fg-secondary text-sm font-medium"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Gallery
                    </button>
                  </div>
                </div>
              ) : (
                /* Image preview + OCR result */
                <div className="flex flex-col gap-3">
                  {/* Preview row */}
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.scanPreviewUrl!}
                      alt="Card preview"
                      className="w-24 h-16 object-cover rounded-xl border border-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {isOcrProcessing ? (
                        <div className="flex items-center gap-2 text-fg-muted text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Reading card...
                        </div>
                      ) : form.scanOcrStatus === "done" ? (
                        <div className="flex items-center gap-1.5 text-accent-green text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Card read
                        </div>
                      ) : form.scanOcrStatus === "error" ? (
                        <div className="flex items-center gap-1.5 text-red-500 text-xs">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {form.scanOcrError}
                        </div>
                      ) : null}
                      <button
                        onClick={() => dispatch({ type: "clear_scan" })}
                        className="text-fg-muted text-xs mt-1 hover:text-fg-secondary"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>

                  {/* Extracted text — editable */}
                  {form.textInput && (
                    <div className="flex flex-col gap-1">
                      <p className="text-fg-secondary text-xs font-medium uppercase tracking-wide">
                        Extracted info
                        <span className="text-fg-muted font-normal normal-case ml-1">(editable)</span>
                      </p>
                      <textarea
                        value={form.textInput}
                        onChange={(e) => dispatch({ type: "set_text", value: e.target.value })}
                        rows={6}
                        className="w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3 text-fg-primary text-sm
                                   placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                                   resize-none font-mono text-xs"
                      />
                    </div>
                  )}

                  {/* Retry OCR if it failed */}
                  {form.scanOcrStatus === "error" && (
                    <button
                      onClick={() => form.scanImageFile && void runOcr(form.scanImageFile)}
                      className="text-accent text-xs font-medium"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Source context */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="capture-context"
              className="text-fg-secondary text-xs font-medium uppercase tracking-wide"
            >
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

          {/* Submit error */}
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
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> {form.submitMessage}
              </>
            ) : form.mode === "scan" && form.scanImageFile ? (
              isNewContact ? "Add Contact from Card" : "Save Card Scan"
            ) : isNewContact ? (
              "Add Contact"
            ) : (
              "Save Note"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
