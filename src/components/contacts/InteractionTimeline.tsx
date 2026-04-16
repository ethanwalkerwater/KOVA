"use client";

import {
  Mic,
  FileText,
  Camera,
  Users,
  Mail,
  Search,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Interaction, InteractionType } from "@/types/interaction";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";

interface InteractionTimelineProps {
  interactions: Interaction[];
  className?: string;
}

interface TypeMeta {
  icon: LucideIcon;
  colorClass: string;
  label: string;
}

const TYPE_META: Record<InteractionType, TypeMeta> = {
  voice_memo: {
    icon: Mic,
    colorClass: "bg-accent-light text-accent",
    label: "Voice Memo",
  },
  text_note: {
    icon: FileText,
    colorClass: "bg-surface-secondary text-fg-secondary",
    label: "Text Note",
  },
  photo: {
    icon: Camera,
    colorClass: "bg-accent-green-light text-accent-green",
    label: "Photo",
  },
  meeting_note: {
    icon: Users,
    colorClass: "bg-accent-light text-accent",
    label: "Meeting Note",
  },
  email_snippet: {
    icon: Mail,
    colorClass: "bg-surface-secondary text-fg-secondary",
    label: "Email Snippet",
  },
  ai_research: {
    icon: Search,
    colorClass: "bg-accent-orange-light text-accent-orange",
    label: "AI Research",
  },
  followup_done: {
    icon: CheckCircle,
    colorClass: "bg-accent-green-light text-accent-green",
    label: "Follow-up Done",
  },
  followup_skipped: {
    icon: Clock,
    colorClass: "bg-surface-secondary text-fg-muted",
    label: "Follow-up Skipped",
  },
  card_scan: {
    icon: CreditCard,
    colorClass: "bg-accent-light text-accent",
    label: "Card Scan",
  },
  import: {
    icon: Download,
    colorClass: "bg-surface-secondary text-fg-secondary",
    label: "Import",
  },
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

export function InteractionTimeline({
  interactions,
  className,
}: InteractionTimelineProps) {
  if (interactions.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-fg-muted text-sm">No interactions yet.</p>
        <p className="text-fg-muted text-xs mt-1">
          Add a voice note or text note to get started.
        </p>
      </div>
    );
  }

  const sorted = [...interactions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className={cn("", className)}>
      {/* Section heading */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-fg-primary font-semibold text-sm">
          Interaction Log
        </span>
        <span className="text-fg-muted text-xs">{interactions.length}</span>
      </div>

      {/* Timeline list */}
      <div className="flex flex-col">
        {sorted.map((interaction, index) => {
          const meta = TYPE_META[interaction.type] ?? {
            icon: FileText,
            colorClass: "bg-surface-secondary text-fg-secondary",
            label: interaction.type,
          };
          const Icon = meta.icon;
          const isLast = index === sorted.length - 1;

          return (
            <div key={interaction.id} className="flex gap-3">
              {/* Left: timeline line + dot */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                    meta.colorClass
                  )}
                >
                  <Icon size={9} />
                </span>
                {!isLast && (
                  <div className="flex-1 border-l-2 border-border-light mt-1 mb-1" />
                )}
              </div>

              {/* Right: content */}
              <div className={cn("pb-4 min-w-0 flex-1", isLast && "pb-0")}>
                {/* Type label + date */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-fg-muted text-xs uppercase tracking-wide">
                    {meta.label}
                  </span>
                  <span className="text-fg-muted text-xs">
                    {formatDate(interaction.created_at)}
                  </span>
                </div>

                {/* source_context badge */}
                {interaction.source_context && (
                  <span className="inline-block mt-1 bg-surface-secondary text-fg-secondary text-xs rounded-full px-2 py-0.5">
                    {interaction.source_context}
                  </span>
                )}

                {/* raw_content */}
                <p className="text-fg-primary text-sm leading-relaxed mt-1">
                  {truncate(interaction.raw_content, 200)}
                </p>

                {/* AI badge */}
                {interaction.ai_generated && (
                  <span className="inline-block mt-1 bg-accent-light text-accent text-xs rounded-full px-1.5 py-0.5">
                    AI
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InteractionTimeline;
