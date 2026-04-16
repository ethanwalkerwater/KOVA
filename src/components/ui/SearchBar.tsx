"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search people...",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="absolute left-3.5 w-4 h-4 text-fg-muted pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[46px] pl-10 pr-4 bg-surface-primary border border-border rounded-xl text-sm text-fg-primary placeholder:text-fg-muted outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}
