import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANTS = {
  primary: "bg-accent text-fg-inverse hover:bg-blue-700 active:bg-blue-800",
  secondary: "bg-surface-secondary text-fg-primary border border-border hover:bg-gray-100",
  ghost: "bg-transparent text-fg-secondary hover:bg-surface-secondary",
  danger: "bg-surface-primary text-red-500 border border-border hover:bg-red-50",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  children: ReactNode;
}

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "flex items-center justify-center gap-2 px-4 h-11 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
