"use client";

import { StatusBar, Avatar, Chip, Button, ChatInputBar } from "@/components/ui";
import type { Contact } from "@/types/contact";

interface FollowupCardProps {
  contact: Contact;
}

function FollowupCard({ contact }: FollowupCardProps) {
  return (
    <div className="bg-surface-primary rounded-2xl border border-border p-4 mb-3">
      {/* Top row: Avatar + name/company + importance chip */}
      <div className="flex items-center gap-3">
        <Avatar name={contact.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-fg-primary font-semibold text-sm leading-tight truncate">
            {contact.name}
          </p>
          {contact.company && <p className="text-fg-muted text-xs truncate">{contact.company}</p>}
        </div>
        {contact.importance === "high" && <Chip label="High Intent" variant="high-intent" />}
      </div>

      {/* Follow-up reason */}
      {contact.followup_reason && (
        <p className="text-fg-secondary text-sm mt-2.5 line-clamp-2">{contact.followup_reason}</p>
      )}

      {/* Bottom row: AI summary + Contact button */}
      <div className="flex items-center justify-between gap-3 mt-3">
        {contact.ai_summary && (
          <p className="text-fg-muted text-xs flex-1 line-clamp-1">{contact.ai_summary}</p>
        )}
        <Button variant="primary" className="h-8 px-3 text-xs shrink-0" onClick={() => {}}>
          Contact
        </Button>
      </div>
    </div>
  );
}

interface HomeScreenProps {
  suggestions: Contact[];
}

export function HomeScreen({ suggestions }: HomeScreenProps) {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col">
      <StatusBar />

      {/* Header */}
      <div className="px-5 pt-2 pb-4">
        <h1 className="text-fg-primary font-bold text-2xl">{greeting} 👋</h1>
        <p className="text-fg-muted text-sm mt-0.5" suppressHydrationWarning>
          {dayName}, {dateStr} · {suggestions.length} follow-up{suggestions.length !== 1 ? "s" : ""}{" "}
          due
        </p>
      </div>

      {/* Today's Follow-ups */}
      {suggestions.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-fg-muted text-xs font-medium uppercase tracking-wide mb-2">
            Today&apos;s Follow-ups
          </p>
          {suggestions.map((contact) => (
            <FollowupCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}

      {/* Quick Add */}
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

      {/* Chat Input Bar */}
      <div className="px-4 pb-4">
        <ChatInputBar
          onSend={() => {}}
          onVoiceStart={() => {}}
          onVoiceEnd={() => {}}
          onCameraPress={() => {}}
          onPlusPress={() => {}}
        />
      </div>
    </div>
  );
}
