"use client";

import {
  Shield,
  Download,
  Bell,
  HelpCircle,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { StatusBar, Avatar } from "@/components/ui";

const MOCK_USER = {
  name: "Alex Morgan",
  email: "alex@company.com",
  plan: "Pro",
  contactCount: 7,
  memberSince: "March 2026",
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
  return (
    <div className="flex flex-col">
      <StatusBar />

      {/* Profile card */}
      <div className="mx-4 mb-4 bg-surface-primary rounded-3xl border border-border p-5">
        <div className="flex flex-col items-center">
          <Avatar name={MOCK_USER.name} size="lg" />
          <p className="text-fg-primary font-bold text-xl text-center mt-3">
            {MOCK_USER.name}
          </p>
          <p className="text-fg-muted text-sm text-center">{MOCK_USER.email}</p>
          <span className="bg-accent text-white rounded-full px-3 py-1 text-xs font-semibold mt-2">
            {MOCK_USER.plan}
          </span>
          <p className="text-fg-secondary text-sm mt-3">
            {MOCK_USER.contactCount} Contacts · Since Mar 2026
          </p>
        </div>
      </div>

      {/* Menu list */}
      <div className="bg-surface-primary rounded-2xl border border-border mx-4 mb-4">
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === MENU_ITEMS.length - 1;
          return (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 py-4 px-5 text-left ${
                isLast ? "" : "border-b border-border-light"
              }`}
              onClick={() => console.log("Menu:", item.label)}
            >
              <Icon className="w-5 h-5 text-fg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-fg-primary text-sm font-medium">{item.label}</p>
                <p className="text-fg-muted text-xs">{item.sublabel}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-fg-muted shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Danger section */}
      <div className="bg-surface-primary rounded-2xl border border-border mx-4 mb-4">
        <button
          className="w-full flex items-center gap-3 px-5 py-4 text-left"
          onClick={() => console.log("Sign out")}
        >
          <LogOut className="w-5 h-5 text-accent-orange shrink-0" />
          <span className="text-accent-orange text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
