/**
 * Voice transcription abstraction — P1.1: Web Speech API → Whisper fallback.
 *
 * Strategy:
 * 1. If Web Speech API is available (Chrome desktop, some Android), use it — zero cost, low latency.
 * 2. If Web Speech API is not available (iOS Safari, Firefox), use MediaRecorder → /api/transcribe (Whisper).
 *
 * The getBestTranscriber() function picks automatically at runtime.
 *
 * @example
 * const t = getBestTranscriber();
 * if (!t.isSupported()) { alert("Voice not supported"); return; }
 * const { text } = await t.transcribe(audioBlob);
 */

export interface TranscriptionResult {
  text: string;
  /** 0–1 confidence score (Web Speech provides this; Whisper is always 1.0). */
  confidence: number;
  /** Which backend was used. */
  backend: "web-speech" | "whisper";
}

export interface Transcriber {
  /** Returns true if this transcriber can run in the current environment. */
  isSupported(): boolean;
  /** Transcribe a Blob of audio (from MediaRecorder). */
  transcribe(audio: Blob): Promise<TranscriptionResult>;
}

// ── Web Speech Transcriber ────────────────────────────────────────────────────

export class WebSpeechTranscriber implements Transcriber {
  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transcribe(_audio: Blob): Promise<TranscriptionResult> {
    // Web Speech API transcribes in real-time via useVoiceInput hook.
    // This method exists for interface compliance but is never called in practice —
    // the hook directly captures the live transcript from SpeechRecognition events.
    return Promise.reject(
      new Error(
        "WebSpeechTranscriber.transcribe() should not be called directly. Use useVoiceInput.",
      ),
    );
  }
}

// ── Whisper Transcriber ───────────────────────────────────────────────────────

export class WhisperTranscriber implements Transcriber {
  isSupported(): boolean {
    // Always supported as long as we have a server to send audio to
    return typeof window !== "undefined";
  }

  async transcribe(audio: Blob): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append("audio", audio, "recording.webm");

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(`Whisper transcription failed: ${body.error ?? response.statusText}`);
    }

    const data = (await response.json()) as { text: string };
    return {
      text: data.text,
      confidence: 1.0,
      backend: "whisper",
    };
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Returns the best available transcriber for the current environment.
 *
 * Preference: Whisper (more reliable cross-browser) → WebSpeech (if somehow preferred)
 * Note: We default to Whisper because iOS Safari lacks Web Speech API,
 * which is our primary mobile target.
 */
export function getBestTranscriber(): Transcriber {
  const whisper = new WhisperTranscriber();
  if (whisper.isSupported()) return whisper;

  const webSpeech = new WebSpeechTranscriber();
  if (webSpeech.isSupported()) return webSpeech;

  // Should never reach here — WhisperTranscriber is always supported in browser
  return whisper;
}
