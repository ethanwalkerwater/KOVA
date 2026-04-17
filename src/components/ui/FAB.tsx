"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FABProps {
  onClick?: () => void;
  className?: string;
}

export function FAB({ onClick, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Add new"
      className={cn(
        "fixed bottom-28 right-5 z-20 flex items-center justify-center w-[60px] h-[60px] rounded-full bg-fg-primary shadow-[0_4px_16px_#00000020]",
        className,
      )}
    >
      <Plus className="w-[26px] h-[26px] text-fg-inverse" />
    </button>
  );
}
