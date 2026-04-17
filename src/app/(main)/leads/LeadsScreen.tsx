"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { StatusBar, Avatar, Button } from "@/components/ui";

const MOCK_LEADS = [
  {
    id: "lead-1",
    name: "Alex Thompson",
    title: "VP Engineering",
    company: "DataSync Pro",
    industry: "B2B SaaS",
    funding: "Series B · $28M",
    location: "Singapore",
    summary: "Recently posted about scaling data pipelines. Company doubled headcount in Q1.",
    relevance:
      "High match — VP Engineering at Series B SaaS, active on LinkedIn about infrastructure",
  },
  {
    id: "lead-2",
    name: "Rachel Kim",
    title: "Head of Procurement",
    company: "ManufactureX",
    industry: "Manufacturing ERP",
    funding: "Series C · $80M",
    location: "Shanghai",
    summary:
      "Attended same industry conference. Company announced digital transformation initiative.",
    relevance: "Medium match — procurement decision maker, known digital transformation budget",
  },
  {
    id: "lead-3",
    name: "Omar Al-Rashid",
    title: "CTO",
    company: "LogiTrack Systems",
    industry: "Logistics SaaS",
    funding: "Seed · $3M",
    location: "Dubai",
    summary:
      "Published article on modern logistics infrastructure. CTO evaluating vendor relationships.",
    relevance: "Medium match — CTO at early-stage logistics SaaS, technical evaluator",
  },
];

interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  funding: string;
  location: string;
  summary: string;
  relevance: string;
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-surface-primary rounded-2xl border border-border p-4 mb-3 mx-4">
      {/* Row 1: Avatar + name + title at company */}
      <div className="flex items-center gap-3 mb-2">
        <Avatar name={lead.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-fg-primary font-semibold text-sm leading-tight truncate">
            {lead.name}
          </p>
          <p className="text-fg-muted text-xs truncate">
            {lead.title} at {lead.company}
          </p>
        </div>
      </div>

      {/* Row 2: Industry + funding badges */}
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-surface-secondary rounded-full px-2 py-0.5 text-xs text-fg-secondary">
          {lead.industry}
        </span>
        <span className="bg-surface-secondary rounded-full px-2 py-0.5 text-xs text-fg-secondary">
          {lead.funding}
        </span>
      </div>

      {/* Row 3: Summary */}
      <p className="text-fg-secondary text-sm line-clamp-2 mb-1">{lead.summary}</p>

      {/* Row 4: Relevance */}
      <p className="text-fg-muted text-xs italic mb-3">{lead.relevance}</p>

      {/* Row 5: Add to Clients button */}
      <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => {}}>
        Add to Clients
      </Button>
    </div>
  );
}

export function LeadsScreen() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  function handleSearch() {
    if (!query.trim()) return;
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 1500);
  }

  return (
    <div className="flex flex-col">
      <StatusBar />

      {/* Header */}
      <div className="px-5 pt-2 pb-3">
        <h1 className="text-fg-primary font-bold text-2xl">Leads</h1>
        <p className="text-fg-muted text-sm mt-0.5">AI-powered lead discovery</p>
      </div>

      {/* Discovery search bar */}
      <div className="bg-surface-primary rounded-2xl border border-border p-4 mx-4 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your ideal lead..."
          className="w-full bg-transparent text-sm text-fg-primary placeholder:text-fg-muted outline-none mb-1"
        />
        <p className="text-fg-muted text-xs mb-3">
          e.g. VP Engineering at Series B SaaS in Southeast Asia
        </p>
        <Button
          variant="primary"
          className="h-9 px-4 text-sm"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? "Searching…" : "Search"}
        </Button>
      </div>

      {/* Lead cards */}
      {MOCK_LEADS.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}

      {/* Find More empty state */}
      <div className="mx-4 mb-4 bg-surface-primary rounded-2xl border border-border-light p-6 text-center">
        <Search className="w-8 h-8 text-fg-muted mx-auto mb-2" />
        <p className="text-fg-primary font-medium text-sm">Find more leads</p>
        <p className="text-fg-muted text-xs mt-1">
          Describe your ideal customer and AI will search the web for matching prospects
        </p>
      </div>
    </div>
  );
}
