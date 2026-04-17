"use client";

/**
 * ContactsTable — responsive table for the desktop Clients view (≥768px).
 *
 * Columns: Name, Company, Stage, Importance, Last Contact, Follow-up, Deal, AI Summary
 * Click header → sort asc/desc. Click row → navigate to /clients/:id.
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from "lucide-react";
import { Avatar, Chip } from "@/components/ui";
import { formatRelativeTime, formatDate } from "@/lib/utils/date";
import type { Contact, PipelineStage } from "@/types/contact";

// ── Types ──────────────────────────────────────────────────────────────────────

type SortKey = "name" | "company" | "stage" | "importance" | "last_interaction_at" | "next_followup_at" | "deal_value" | "relationship_score";
type SortDir = "asc" | "desc";

// ── Helpers ────────────────────────────────────────────────────────────────────

const IMPORTANCE_ORDER = { high: 0, medium: 1, low: 2 };
const STAGE_ORDER: Record<PipelineStage, number> = {
  negotiating: 0,
  engaged: 1,
  contacted: 2,
  new_lead: 3,
  closed_won: 4,
  dormant: 5,
  closed_lost: 6,
};

function stageLabel(stage: PipelineStage): string {
  return {
    new_lead: "New Lead",
    contacted: "Contacted",
    engaged: "Engaged",
    negotiating: "Negotiating",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost",
    dormant: "Dormant",
  }[stage] ?? stage;
}

function stageVariant(stage: PipelineStage): Parameters<typeof Chip>[0]["variant"] {
  switch (stage) {
    case "new_lead": return "new-lead";
    case "engaged": return "engaged";
    case "negotiating": return "negotiating";
    case "closed_won": case "closed_lost": return "closed";
    case "dormant": return "dormant";
    default: return "default";
  }
}

function importanceDot(importance: Contact["importance"]) {
  const color =
    importance === "high"
      ? "bg-accent-orange"
      : importance === "medium"
      ? "bg-accent"
      : "bg-border";
  const label =
    importance === "high" ? "High" : importance === "medium" ? "Medium" : "Low";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
      <span className="text-fg-secondary text-xs">{label}</span>
    </span>
  );
}

function formatDealValue(value: number | null, currency: string): string {
  if (value === null) return "—";
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
    notation: value >= 1_000_000 ? "compact" : "standard",
  });
  return fmt.format(value);
}

// ── Sort logic ─────────────────────────────────────────────────────────────────

function sortContacts(contacts: Contact[], key: SortKey, dir: SortDir): Contact[] {
  const multiplier = dir === "asc" ? 1 : -1;

  return [...contacts].sort((a, b) => {
    switch (key) {
      case "name":
        return multiplier * a.name.localeCompare(b.name);
      case "company":
        return multiplier * ((a.company ?? "").localeCompare(b.company ?? ""));
      case "stage":
        return multiplier * ((STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99));
      case "importance":
        return multiplier * ((IMPORTANCE_ORDER[a.importance] ?? 99) - (IMPORTANCE_ORDER[b.importance] ?? 99));
      case "last_interaction_at": {
        const aTime = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
        const bTime = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
        return multiplier * (aTime - bTime);
      }
      case "next_followup_at": {
        const aTime = a.next_followup_at ? new Date(a.next_followup_at).getTime() : Infinity;
        const bTime = b.next_followup_at ? new Date(b.next_followup_at).getTime() : Infinity;
        return multiplier * (aTime - bTime);
      }
      case "deal_value":
        return multiplier * ((a.deal_value ?? -1) - (b.deal_value ?? -1));
      case "relationship_score":
        return multiplier * ((a.relationship_score ?? 0) - (b.relationship_score ?? 0));
      default:
        return 0;
    }
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({ label, sortKey, currentKey, currentDir, onSort, className = "" }: SortHeaderProps) {
  const active = currentKey === sortKey;
  return (
    <th
      className={`text-left text-xs font-semibold text-fg-secondary uppercase tracking-wide py-3 px-4 cursor-pointer select-none hover:text-fg-primary transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          currentDir === "asc" ? (
            <ChevronUp className="w-3 h-3 text-accent shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 text-accent shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-fg-muted shrink-0" />
        )}
      </span>
    </th>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ContactsTableProps {
  contacts: Contact[];
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("last_interaction_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  const sorted = sortContacts(contacts, sortKey, sortDir);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface-primary">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-border bg-surface-secondary">
          <tr>
            <SortHeader label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-5 rounded-tl-2xl" />
            <SortHeader label="Company" sortKey="company" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Stage" sortKey="stage" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Priority" sortKey="importance" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Last Contact" sortKey="last_interaction_at" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Follow-up" sortKey="next_followup_at" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Deal" sortKey="deal_value" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <th className="text-left text-xs font-semibold text-fg-secondary uppercase tracking-wide py-3 px-4 pr-5">
              AI Summary
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((contact, i) => {
            const isLast = i === sorted.length - 1;
            const isOverdue =
              contact.next_followup_at &&
              new Date(contact.next_followup_at) < new Date();

            return (
              <tr
                key={contact.id}
                className={`group hover:bg-accent-light transition-colors ${!isLast ? "border-b border-border-light" : ""}`}
              >
                {/* Name */}
                <td className="py-3 px-4 pl-5">
                  <Link href={`/clients/${contact.id}`} className="flex items-center gap-2.5">
                    <Avatar name={contact.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold text-fg-primary text-sm leading-tight group-hover:text-accent truncate max-w-[140px]">
                        {contact.name}
                      </p>
                      {contact.title && (
                        <p className="text-fg-muted text-xs truncate max-w-[140px]">{contact.title}</p>
                      )}
                    </div>
                  </Link>
                </td>

                {/* Company */}
                <td className="py-3 px-4">
                  <span className="text-fg-secondary text-sm truncate max-w-[120px] block">
                    {contact.company ?? "—"}
                  </span>
                  {contact.company_industry && (
                    <span className="text-fg-muted text-xs">{contact.company_industry}</span>
                  )}
                </td>

                {/* Stage */}
                <td className="py-3 px-4">
                  <Chip label={stageLabel(contact.stage)} variant={stageVariant(contact.stage)} />
                </td>

                {/* Importance */}
                <td className="py-3 px-4">{importanceDot(contact.importance)}</td>

                {/* Last contact */}
                <td className="py-3 px-4">
                  {contact.last_interaction_at ? (
                    <span className="text-fg-secondary text-xs" suppressHydrationWarning>
                      {formatRelativeTime(contact.last_interaction_at)}
                    </span>
                  ) : (
                    <span className="text-fg-muted text-xs">Never</span>
                  )}
                </td>

                {/* Follow-up */}
                <td className="py-3 px-4">
                  {contact.next_followup_at ? (
                    <span
                      className={`text-xs font-medium ${isOverdue ? "text-red-500" : "text-fg-secondary"}`}
                      title={contact.followup_reason ?? undefined}
                    >
                      {isOverdue ? "⚠ " : ""}
                      {formatDate(contact.next_followup_at)}
                    </span>
                  ) : (
                    <span className="text-fg-muted text-xs">—</span>
                  )}
                </td>

                {/* Deal value */}
                <td className="py-3 px-4">
                  {contact.deal_value !== null ? (
                    <div>
                      <span className="text-fg-primary text-sm font-medium">
                        {formatDealValue(contact.deal_value, contact.deal_currency)}
                      </span>
                      {contact.deal_probability !== null && (
                        <span className="text-fg-muted text-xs ml-1">{contact.deal_probability}%</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-fg-muted text-xs">—</span>
                  )}
                </td>

                {/* AI summary */}
                <td className="py-3 px-4 pr-5">
                  <div className="flex items-start gap-2 max-w-[280px]">
                    <p className="text-fg-secondary text-xs line-clamp-2 flex-1 min-w-0">
                      {contact.ai_summary ?? "—"}
                    </p>
                    <Link
                      href={`/clients/${contact.id}`}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Open ${contact.name}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-accent" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}

          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-16 text-fg-muted text-sm">
                No contacts to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
