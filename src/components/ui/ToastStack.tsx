"use client";

/**
 * ToastStack — renders the global toast queue from useUIStore.
 *
 * Mount this once in the root layout (or main layout). Toasts auto-dismiss
 * after 3s. Stacks bottom-up, respects safe-area-inset-bottom for iOS.
 */

import { useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useUIStore, type Toast, type ToastVariant } from "@/stores/ui";
import { cn } from "@/lib/utils/cn";

const AUTO_DISMISS_MS = 3000;

function toastIcon(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 shrink-0 text-accent-green" />;
    case "error":
      return <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />;
    default:
      return <Info className="w-4 h-4 shrink-0 text-accent" />;
  }
}

function toastStyles(variant: ToastVariant): string {
  switch (variant) {
    case "success":
      return "bg-accent-green-light border-accent-green/30 text-accent-green";
    case "error":
      return "bg-red-50 border-red-200 text-red-700";
    default:
      return "bg-surface-primary border-border text-fg-primary";
  }
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  // Auto-dismiss — actionable toasts can override the default duration.
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.durationMs ?? AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-md",
        "w-full max-w-sm animate-in slide-in-from-bottom-2 duration-200",
        toastStyles(toast.variant),
      )}
    >
      {toastIcon(toast.variant)}
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          className="text-sm font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity shrink-0"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastStack() {
  const { toasts, dismissToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col-reverse gap-2 px-4
                 pb-[calc(77px+env(safe-area-inset-bottom,0px)+8px)] pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}
