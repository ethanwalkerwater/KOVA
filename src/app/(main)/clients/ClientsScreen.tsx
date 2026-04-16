"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MessageSquare } from "lucide-react";
import { StatusBar, SearchBar, Avatar, Chip, FAB } from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils/date";
import type { Contact, PipelineStage } from "@/types/contact";

type Filter = "all" | "high" | "engaged" | "negotiating";

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High Priority" },
  { value: "engaged", label: "Engaged" },
  { value: "negotiating", label: "Negotiating" },
];

function getStageChip(stage: PipelineStage): { variant: Parameters<typeof Chip>[0]["variant"]; label: string } | null {
  switch (stage) {
    case "new_lead":
      return { variant: "new-lead", label: "New Lead" };
    case "contacted":
      return null;
    case "engaged":
      return { variant: "engaged", label: "Engaged" };
    case "negotiating":
      return { variant: "negotiating", label: "Negotiating" };
    case "closed_won":
      return { variant: "closed", label: "Closed" };
    case "closed_lost":
      return { variant: "closed", label: "Lost" };
    case "dormant":
      return { variant: "dormant", label: "Dormant" };
    default:
      return null;
  }
}

interface ContactCardProps {
  contact: Contact;
  isLast: boolean;
}

function ContactCard({ contact, isLast }: ContactCardProps) {
  const stageChip = getStageChip(contact.stage);

  return (
    <Link
      href={`/clients/${contact.id}`}
      className={`flex items-center gap-3 px-5 py-3.5 bg-surface-primary${!isLast ? " border-b border-border-light" : ""}`}
    >
      <Avatar size="sm" name={contact.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-fg-primary text-sm">{contact.name}</span>
          {contact.last_interaction_at && (
            <span
              className="text-fg-muted text-xs ml-2 shrink-0"
              suppressHydrationWarning
            >
              {formatRelativeTime(contact.last_interaction_at)}
            </span>
          )}
        </div>
        {(contact.title || contact.company) && (
          <p className="text-fg-secondary text-xs truncate">
            {[contact.title, contact.company].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {stageChip && (
            <Chip label={stageChip.label} variant={stageChip.variant} />
          )}
          {contact.importance === "high" && (
            <span className="w-2 h-2 rounded-full bg-accent-orange shrink-0" aria-label="High priority" />
          )}
          {contact.importance === "medium" && (
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-label="Medium priority" />
          )}
        </div>
      </div>
    </Link>
  );
}

interface ClientsScreenProps {
  contacts: Contact[];
}

export function ClientsScreen({ contacts }: ClientsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Apply filter
  let filtered = contacts.filter((c) => {
    if (filter === "high") return c.importance === "high";
    if (filter === "engaged") return c.stage === "engaged" || c.stage === "negotiating";
    if (filter === "negotiating") return c.stage === "negotiating";
    return true;
  });

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false) ||
        (c.title?.toLowerCase().includes(q) ?? false)
    );
  }

  // Sort: high importance first, then by last_interaction_at descending
  filtered = [...filtered].sort((a, b) => {
    if (a.importance === "high" && b.importance !== "high") return -1;
    if (a.importance !== "high" && b.importance === "high") return 1;
    const aTime = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
    const bTime = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="flex flex-col h-full bg-surface-primary">
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <h1 className="text-fg-primary font-bold text-2xl">Clients</h1>
        <button className="w-9 h-9 rounded-full bg-fg-primary flex items-center justify-center">
          <Plus className="w-4 h-4 text-fg-inverse" />
        </button>
      </div>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={(value) => setSearchQuery(value)}
        className="mx-5 mb-3"
      />

      {/* Filter chips */}
      <div className="flex overflow-x-auto px-5 mb-3 scrollbar-none">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium mr-2 whitespace-nowrap shrink-0 ${
              filter === option.value
                ? "bg-fg-primary text-fg-inverse"
                : "bg-surface-secondary text-fg-secondary border border-border"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && searchQuery.trim() ? (
          <div className="text-center py-12">
            <p className="text-fg-muted text-sm">No contacts match &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          filtered.map((contact, index) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isLast={index === filtered.length - 1}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <FAB
        onClick={() => console.log("Add")}
      />
    </div>
  );
}
