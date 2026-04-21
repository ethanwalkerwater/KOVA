"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp, Pencil, RotateCcw } from "lucide-react";
import type { Section } from "@/types/section";
import { getSectionIcon, getSectionColor } from "@/lib/markdown/sections";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/date";

interface SectionRendererProps {
  section: Section;
  defaultExpanded?: boolean;
  className?: string;
  /** Called when user clicks "Edit" — parent handles the editing UI */
  onEdit?: (section: Section) => void;
  /** Called when user clicks "Restore AI" to clear the override */
  onRestoreAI?: (section: Section) => void;
}

export function SectionRenderer({
  section,
  defaultExpanded = true,
  className,
  onEdit,
  onRestoreAI,
}: SectionRendererProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Flash the card border for 900ms whenever regenerated_at advances, so the
  // user gets a visible signal that AI rebuilt this section. First mount does
  // not flash (initial load should feel calm).
  const [justRebuilt, setJustRebuilt] = useState(false);
  const prevRegeneratedAtRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevRegeneratedAtRef.current;
    if (prev !== null && prev !== section.regenerated_at) {
      setJustRebuilt(true);
      const t = setTimeout(() => setJustRebuilt(false), 900);
      prevRegeneratedAtRef.current = section.regenerated_at;
      return () => clearTimeout(t);
    }
    prevRegeneratedAtRef.current = section.regenerated_at;
  }, [section.regenerated_at]);

  const Icon = getSectionIcon(section.slug);
  const colorClass = getSectionColor(section.slug);
  const isOverridden = Boolean(section.user_overrides_md);
  const displayContent = isOverridden ? section.user_overrides_md! : section.content_md;

  return (
    <div
      className={cn(
        "bg-surface-primary rounded-2xl border p-4 transition-colors duration-700",
        justRebuilt ? "border-accent shadow-[0_0_0_3px_rgba(37,99,235,0.15)]" : "border-border",
        className,
      )}
    >
      {/* Header row — div (not button) so we can nest interactive controls */}
      <div className="flex w-full items-center justify-between">
        {/* Left: expand toggle + icon + title */}
        <button
          type="button"
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${section.title} section`}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              colorClass,
            )}
          >
            {/* eslint-disable-next-line react-hooks/static-components -- Icon is a reference to a static Lucide component, not a new function */}
            <Icon size={14} />
          </span>
          <span className="text-fg-primary font-semibold text-sm">{section.title}</span>
          {isOverridden && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-accent-light px-1.5 py-0.5 text-[10px] font-medium text-accent">
              <Pencil size={8} />
              Edited
            </span>
          )}
        </button>

        {/* Right: interaction count + edit/restore controls + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {section.interaction_count > 0 && (
            <span className="text-fg-muted text-xs">
              {section.interaction_count} interaction
              {section.interaction_count !== 1 ? "s" : ""}
            </span>
          )}

          {/* Override controls — only shown when expanded */}
          {expanded && (
            <>
              {isOverridden && onRestoreAI && (
                <button
                  type="button"
                  onClick={() => onRestoreAI(section)}
                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-fg-secondary hover:text-accent hover:bg-accent-light transition-colors"
                  aria-label="Restore AI-generated content"
                  title="Restore AI version"
                >
                  <RotateCcw size={10} />
                  Restore AI
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(section)}
                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-fg-secondary hover:text-accent hover:bg-accent-light transition-colors"
                  aria-label={`Edit ${section.title} section`}
                  title="Edit section"
                >
                  <Pencil size={10} />
                  Edit
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            tabIndex={-1}
            aria-hidden="true"
            className="p-0.5"
          >
            {expanded ? (
              <ChevronUp size={12} className="text-fg-muted" />
            ) : (
              <ChevronDown size={12} className="text-fg-muted" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Timestamp line */}
          <p className="mt-1 text-fg-muted text-xs" suppressHydrationWarning>
            {isOverridden && section.overridden_at ? (
              <>
                <span className="text-accent">Edited</span> ·{" "}
                {formatRelativeTime(section.overridden_at)}
                {section.override_reason && (
                  <span className="block mt-0.5 italic">
                    &ldquo;{section.override_reason}&rdquo;
                  </span>
                )}
              </>
            ) : (
              <>Updated · {formatRelativeTime(section.regenerated_at)}</>
            )}
          </p>

          {/* Divider */}
          <div className="border-t border-border-light mt-3 mb-3" />

          {/* Markdown content or empty state */}
          {displayContent.trim() ? (
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
                "[&_code]:bg-surface-secondary [&_code]:px-1 [&_code]:rounded [&_code]:text-xs",
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
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
