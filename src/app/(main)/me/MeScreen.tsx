"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Download, Bell, HelpCircle, ChevronRight, LogOut, Loader2 } from "lucide-react";
import { StatusBar, Avatar } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { useContactsStore } from "@/stores/contacts";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useUIStore } from "@/stores/ui";

// Phase 1 fallback profile shown when Supabase is not configured
const DEMO_USER = {
  name: "Demo User",
  email: "demo@kova.app",
  plan: "Free",
};

const MENU_ITEMS = [
  {
    icon: Shield,
    label: "Privacy & Data",
    sublabel: "Your data stays private",
  },
  {
    icon: Download,
    label: "Export Contacts",
    sublabel: "Download as CSV or JSON",
  },
  {
    icon: Bell,
    label: "Notifications",
    sublabel: "Follow-up reminders",
  },
  {
    icon: HelpCircle,
    label: "Help & Feedback",
    sublabel: "Get support",
  },
];

export function MeScreen() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuthStore();
  const { addToast } = useUIStore();
  const contactCount = useContactsStore((s) => Object.keys(s.contacts).length);
  const [exporting, setExporting] = useState(false);

  // Resolve display values: real user in Phase 2, demo values in Phase 1
  const displayName = user?.user_metadata?.display_name as string | undefined
    ?? user?.email?.split("@")[0]
    ?? DEMO_USER.name;
  const displayEmail = user?.email ?? DEMO_USER.email;
  const displayPlan = "Free"; // subscription tier from profiles table — extend later

  // Member since: use user.created_at if available
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "March 2026";

  const handleExport = useCallback(
    async (format: "csv" | "json") => {
      if (!isSupabaseConfigured()) {
        addToast("Connect Supabase to export real contacts", "info");
        return;
      }

      setExporting(true);
      try {
        const res = await fetch(`/api/export?format=${format}`);
        if (!res.ok) throw new Error("Export failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
          `kova-contacts.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        addToast(`Exported as ${format.toUpperCase()}`, "success");
      } catch {
        addToast("Export failed — try again", "error");
      } finally {
        setExporting(false);
      }
    },
    [addToast],
  );

  const handleSignOut = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      addToast("Connect Supabase to use sign-out", "info");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
      signOut(); // clear Zustand store
      router.push("/login");
    } catch {
      addToast("Sign out failed — try again", "error");
    }
  }, [signOut, router, addToast]);

  // Show a minimal spinner while auth is loading (only on initial mount in Phase 2)
  if (authLoading && isSupabaseConfigured()) {
    return (
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-fg-muted animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <StatusBar />

      {/* Profile card */}
      <div className="mx-4 mb-4 bg-surface-primary rounded-3xl border border-border p-5">
        <div className="flex flex-col items-center">
          <Avatar name={displayName} size="lg" />
          <p className="text-fg-primary font-bold text-xl text-center mt-3">{displayName}</p>
          <p className="text-fg-muted text-sm text-center">{displayEmail}</p>
          <span className="bg-accent text-white rounded-full px-3 py-1 text-xs font-semibold mt-2">
            {displayPlan}
          </span>
          <p className="text-fg-secondary text-sm mt-3">
            {contactCount > 0 ? `${contactCount} Contact${contactCount !== 1 ? "s" : ""}` : "No contacts yet"}
            {" · Since "}
            {memberSince}
          </p>
        </div>
      </div>

      {/* Menu list */}
      <div className="bg-surface-primary rounded-2xl border border-border mx-4 mb-4">
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === MENU_ITEMS.length - 1;

          const handleClick = () => {
            if (item.label === "Export Contacts") {
              // Show inline CSV/JSON choice using two quick toasts isn't ideal,
              // so we just default to CSV — users who want JSON can tap again.
              void handleExport("csv");
            } else {
              addToast(`${item.label} — coming soon`, "info");
            }
          };

          const isExportItem = item.label === "Export Contacts";

          return (
            <button
              key={item.label}
              disabled={isExportItem && exporting}
              className={`w-full flex items-center gap-3 py-4 px-5 text-left ${
                isLast ? "" : "border-b border-border-light"
              } disabled:opacity-50`}
              onClick={handleClick}
            >
              {isExportItem && exporting ? (
                <Loader2 className="w-5 h-5 text-fg-muted shrink-0 animate-spin" />
              ) : (
                <Icon className="w-5 h-5 text-fg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-fg-primary text-sm font-medium">{item.label}</p>
                <p className="text-fg-muted text-xs">
                  {isExportItem ? "Download as CSV (tap) or JSON" : item.sublabel}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-fg-muted shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Sign out */}
      <div className="bg-surface-primary rounded-2xl border border-border mx-4 mb-4">
        <button
          className="w-full flex items-center gap-3 px-5 py-4 text-left"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="w-5 h-5 text-accent-orange shrink-0" />
          <span className="text-accent-orange text-sm font-medium">Sign Out</span>
        </button>
      </div>

      {/* Phase 1 hint */}
      {!isSupabaseConfigured() && (
        <p className="text-fg-muted text-xs text-center px-8 pb-4">
          Running in demo mode. Connect Supabase to enable real accounts.
        </p>
      )}
    </div>
  );
}
