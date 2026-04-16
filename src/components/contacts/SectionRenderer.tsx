"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Section } from "@/types/section";
import { getSectionIcon, getSectionColor } from "@/lib/markdown/sections";
import { cn } from "@/lib/utils/cn";

interface SectionRendererProps {
  section: Section;
  defaultExpanded?: boolean;
  className?: string;
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;

  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;

  const diffYr = Math.floor(diffMo / 12);
  return `${diffYr}y ago`;
}

export function SectionRenderer({
  section,
  defaultExpanded = true,
  className,
}: SectionRendererProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const Icon = getSectionIcon(section.slug);
  const colorClass = getSectionColor(section.slug);

  return (
    <div
      className={cn(
        "bg-surface-primary rounded-2xl border border-border p-4",
        className
      )}
    >
      {/* Header row */}
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {/* Left: icon + title */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              colorClass
            )}
          >
            <Icon size={14} />
          </span>
          <span className="text-fg-primary font-semibold text-sm">
            {section.title}
          </span>
        </div>

        {/* Right: interaction count + chevron */}
        <div className="flex items-center gap-1.5">
          {section.interaction_count > 0 && (
            <span className="text-fg-muted text-xs">
              {section.interaction_count} interaction
              {section.interaction_count !== 1 ? "s" : ""}
            </span>
          )}
          {expanded ? (
            <ChevronUp size={12} className="text-fg-muted" />
          ) : (
            <ChevronDown size={12} className="text-fg-muted" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Regeneration timestamp */}
          <p className="mt-1 text-fg-muted text-xs">
            Updated · {formatRelativeTime(section.regenerated_at)}
          </p>

          {/* Divider */}
          <div className="border-t border-border-light mt-3 mb-3" />

          {/* Markdown content or empty state */}
          {section.content_md.trim() ? (
            <div
              className={cn(
                "text-sm text-fg-secondary leading-relaxed",
                "[&_h1]:text-fg-primary [&_h1]:font-semibold [&_h1]:text-base [&_h1]:mb-2",
                "[&_h2]:text-fg-primary [&_h2]:font-semibold [&_h2]:text-sm [&_h2]:mb-1.5 [&_h2]:mt-3",
                "[&_h3]:text-fg-secondary [&_h3]:font-medium [&_h3]:text-sm [&_h3]:mb-1 [&_h3]:mt-2",
                "[&_p]:mb-2 [&_p:last-child]:mb-0",
                "[&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2",
                "[&_li]:mb-0.5",
                "[&_strong]:text-fg-primary [&_strong]:font-semibold",
                "[&_a]:text-accent [&_a]:underline",
                "[&_code]:bg-surface-secondary [&_code]:px-1 [&_code]:rounded [&_code]:text-xs"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.content_md}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-fg-muted text-sm italic">
              No content yet. Add an interaction to populate this section.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default SectionRenderer;
