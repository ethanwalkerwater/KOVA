import { User, Building2, MessageSquare, Calendar, Search, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DEFAULT_SECTIONS } from "@/types/section";
import type { SectionSlug } from "@/types/section";

export { DEFAULT_SECTIONS };

export function getSectionIcon(slug: SectionSlug): LucideIcon {
  switch (slug) {
    case "profile":
      return User;
    case "company":
      return Building2;
    case "outreach":
      return MessageSquare;
    case "follow-up":
      return Calendar;
    case "research":
      return Search;
    default:
      return FileText;
  }
}

export function getSectionColor(slug: SectionSlug): string {
  switch (slug) {
    case "profile":
      return "bg-accent-light text-accent";
    case "company":
      return "bg-accent-green-light text-accent-green";
    case "outreach":
      return "bg-surface-secondary text-fg-secondary";
    case "follow-up":
      return "bg-accent-orange-light text-accent-orange";
    case "research":
      return "bg-surface-secondary text-fg-secondary";
    default:
      return "bg-surface-secondary text-fg-secondary";
  }
}
