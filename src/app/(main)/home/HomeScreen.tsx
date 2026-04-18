"use client";

import Link from "next/link";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { StatusBar, Avatar, Chip, ChatInputBar } from "@/components/ui";
import { useUIStore } from "@/stores/ui";
import { useSuggestions, type DailySuggestion } from "@/lib/hooks/useSuggestions";

// ── Follow-up card ─────────────────────────────────────────────────────────────

interface FollowupCardProps {
  suggestion: DailySuggestion;
  onDone: (contactId: string) => void;
  onLater: (contactId: string) => void;
}

function FollowupCard({ suggestion, onDone, onLater }: FollowupCardProps) {
  const { contact, reason, urgency } = suggestion;

  return (
    <div className="bg-surface-primary rounded-2xl border border-border p-4 mb-3">
      {/* Top row: Avatar + name/company + importance chip */}
      <div className="flex items-center gap-3">
        <Link href={`/clients/${contact.id}`}>
          <Avatar name={contact.name} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/clients/${contact.id}`}>
            <p className="text-fg-primary font-semibold text-sm leading-tight truncate hover:text-accent">
              {contact.name}
            </p>
          </Link>
          {contact.company && (
            <p className="text-fg-muted text-xs truncate">{contact.company}</p>
          )}
        </div>
        {urgency === 2 && <Chip label="Due today" variant="high-intent" />}
        {urgency === 1 && <Chip label="High priority" variant="engaged" />}
      </div>

      {/* Reason */}
      <p className="text-fg-secondary text-sm mt-2.5 line-clamp-2">{reason}</p>

      {/* AI summary */}
      {contact.ai_summary && (
        <p className="text-fg-muted text-xs mt-1 line-clamp-1 italic">{contact.ai_summary}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onDone(contact.id)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent-green-light text-accent-green text-xs font-medium hover:bg-accent-green hover:text-white transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Done
        </button>
        <button
          onClick={() => onLater(contact.id)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface-secondary text-fg-secondary text-xs font-medium hover:bg-border transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          Later
        </button>
        <Link
          href={`/clients/${contact.id}`}
          className="ml-auto text-accent text-xs font-medium hover:underline"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { openCapture } = useUIStore();
  const { suggestions, loading, markDone, markLater } = useSuggestions();

  return (
    <div className="flex flex-col h-full">
      <StatusBar />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Header */}
        <div className="px-5 pt-2 pb-4">
          <h1 className="text-fg-primary font-bold text-2xl">{greeting} 👋</h1>
          <p className="text-fg-muted text-sm mt-0.5" suppressHydrationWarning>
            {dayName}, {dateStr}
            {!loading && suggestions.length > 0 && (
              <> · {suggestions.length} follow-up{suggestions.length !== 1 ? "s" : ""} due</>
            )}
          </p>
        </div>

        {/* Today's Follow-ups */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-fg-muted animate-spin" />
          </div>
        ) : suggestions.length > 0 ? (
          <div className="px-5 pb-4">
            <p className="text-fg-muted text-xs font-medium uppercase tracking-wide mb-2">
              Today&apos;s Follow-ups
            </p>
            {suggestions.map((s) => (
              <FollowupCard
                key={s.contact.id}
                suggestion={s}
                onDone={markDone}
                onLater={markLater}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 pb-4">
            <div className="bg-accent-green-light rounded-2xl border border-accent-green/20 p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-accent-green mx-auto mb-1" />
              <p className="text-accent-green font-medium text-sm">All caught up!</p>
              <p className="text-accent-green/70 text-xs mt-0.5">No follow-ups due today.</p>
            </div>
          </div>
        )}

        {/* Quick Add prompt */}
        <div className="px-5 pb-4">
          <p className="text-fg-muted text-xs font-medium uppercase tracking-wide mb-2">Quick Add</p>
          <div className="bg-surface-primary rounded-2xl border border-border p-4">
            <p className="text-fg-muted text-sm">
              Tell me about someone you just met. I&apos;ll organize it for you.
            </p>
            <p className="text-fg-muted text-xs mt-2 italic">
              Example: &quot;Met Zhang Wei from Alibaba Cloud today at the SaaStr conference, wants to
              discuss cloud migration Q3&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Chat Input Bar — sticky at bottom above TabBar, opens CaptureSheet */}
      <div className="shrink-0 bg-surface-secondary">
        <ChatInputBar
          onSend={(text) => openCapture(undefined, text)}
          onVoiceStart={() => openCapture()}
          onVoiceEnd={() => {}}
          onCameraPress={() => openCapture(undefined, undefined, "scan")}
          onPlusPress={() => openCapture()}
          placeholder="Tell me about someone you just met..."
        />
      </div>
    </div>
  );
}
