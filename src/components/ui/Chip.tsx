import { cn } from "@/lib/utils/cn";

const VARIANTS = {
  "high-intent": "bg-accent-green-light text-accent-green",
  connected: "bg-accent-light text-accent",
  "follow-up": "bg-accent-orange-light text-accent-orange",
  "new-lead": "bg-surface-secondary text-fg-secondary border border-border",
  engaged: "bg-accent-light text-accent",
  negotiating: "bg-accent-orange-light text-accent-orange",
  closed: "bg-accent-green-light text-accent-green",
  dormant: "bg-surface-secondary text-fg-muted",
  default: "bg-surface-secondary text-fg-secondary",
} as const;

type ChipVariant = keyof typeof VARIANTS;

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  className?: string;
}

export function Chip({ label, variant = "default", className }: ChipProps) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        VARIANTS[variant] ?? VARIANTS.default,
        className
      )}
    >
      {label}
    </span>
  );
}
