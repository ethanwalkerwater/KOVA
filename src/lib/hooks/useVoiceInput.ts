/**
 * useVoiceInput — records audio and produces a transcript.
 *
 * Strategy:
 * - Uses MediaRecorder API to capture audio as a Blob.
 * - Sends the Blob to /api/transcribe (Whisper) for reliable cross-browser transcription.
 * - Falls back gracefully if MediaRecorder is unavailable.
 *
 * @example
 * const { state, start, stop, transcript, error } = useVoiceInput();
 *
 * <button onPointerDown={start} onPointerUp={stop}>
 *   {state === "recording" ? "Release to send" : "Hold to record"}
 * </button>
 * {transcript && <p>{transcript}</p>}
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { WhisperTranscriber } from "@/lib/voice/transcribe";

export type VoiceInputState = "idle" | "recording" | "transcribing" | "done" | "error";

/** Hard cap on recording length. Transcription is billed per second, and a
 *  backgrounded PWA could otherwise record forever. */
export const MAX_RECORDING_MS = 5 * 60 * 1000;
/** Warn (amber timer) when the user is 1 minute from the cap. */
export const RECORDING_WARN_MS = 4 * 60 * 1000;

interface UseVoiceInputReturn {
  state: VoiceInputState;
  transcript: string | null;
  error: string | null;
  /** Duration in milliseconds (set when recording stops). */
  durationMs: number | null;
  /** Live ms since recording started — ticks while state === "recording". */
  elapsedMs: number;
  /** True if the last stop was triggered by the 5-minute hard cap. UI can
   *  use this to show a "recording stopped at 5 min max" toast. */
  autoStopped: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
  /** True if MediaRecorder API is available. */
  isSupported: boolean;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceInputState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [autoStopped, setAutoStopped] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Live ticker that updates elapsedMs and enforces MAX_RECORDING_MS.
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    Boolean(window.MediaRecorder) &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const reset = useCallback(() => {
    // Abort any in-flight recording and release the mic stream so the
    // browser's recording indicator turns off and we don't leak audio
    // frames when the caller resets mid-record (e.g. closing the sheet).
    clearTicker();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.stop();
      } catch {
        // ignore — already stopping
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    startTimeRef.current = null;
    chunksRef.current = [];

    setState("idle");
    setTranscript(null);
    setError(null);
    setDurationMs(null);
    setElapsedMs(0);
    setAutoStopped(false);
  }, [clearTicker]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setError("Voice recording is not supported in this browser.");
      setState("error");
      return;
    }

    try {
      setError(null);
      setTranscript(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick the best supported MIME type
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      const startedAt = Date.now();
      startTimeRef.current = startedAt;
      setElapsedMs(0);
      setAutoStopped(false);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(250); // collect chunks every 250ms
      setState("recording");

      // Live ticker — updates elapsedMs (drives the UI timer) and enforces
      // the 5-minute hard cap. We call recorder.stop() directly because
      // the onstop handler installed by stop() isn't attached yet at this
      // point; the hard-cap path installs its own in a moment.
      clearTicker();
      tickerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setElapsedMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS) {
          clearTicker();
          setAutoStopped(true);
          // Trigger the normal stop+transcribe path. We can't await here
          // (setInterval callback), but the onstop handler fires async.
          const rec = mediaRecorderRef.current;
          if (rec && rec.state !== "inactive") {
            // If no one has wired an onstop yet, wire one now so transcription
            // still runs. This mirrors the logic inside stop().
            if (!rec.onstop) {
              rec.onstop = async () => {
                setDurationMs(Date.now() - startedAt);
                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;

                if (chunksRef.current.length === 0) {
                  setError("No audio recorded.");
                  setState("error");
                  return;
                }

                const audioBlob = new Blob(chunksRef.current, {
                  type: rec.mimeType || "audio/webm",
                });
                setState("transcribing");
                try {
                  const transcriber = new WhisperTranscriber();
                  const result = await transcriber.transcribe(audioBlob);
                  setTranscript(result.text);
                  setState("done");
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Transcription failed";
                  setError(msg);
                  setState("error");
                }
              };
            }
            try {
              rec.stop();
            } catch {
              /* already stopping */
            }
          }
        }
      }, 250);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setError(msg);
      setState("error");
    }
  }, [isSupported, clearTicker]);

  const stop = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    clearTicker();

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
        setDurationMs(elapsed);

        // Stop all tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setError("No audio recorded.");
          setState("error");
          resolve();
          return;
        }

        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setState("transcribing");

        try {
          const transcriber = new WhisperTranscriber();
          const result = await transcriber.transcribe(audioBlob);
          setTranscript(result.text);
          setState("done");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Transcription failed";
          setError(msg);
          setState("error");
        }

        resolve();
      };

      recorder.stop();
    });
  }, [clearTicker]);

  return {
    state,
    transcript,
    error,
    durationMs,
    elapsedMs,
    autoStopped,
    start,
    stop,
    reset,
    isSupported,
  };
}
