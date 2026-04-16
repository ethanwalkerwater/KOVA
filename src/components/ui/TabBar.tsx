"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Target, Users, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/home", label: "HOME", icon: Home },
  { href: "/leads", label: "LEADS", icon: Target },
  { href: "/clients", label: "CLIENT", icon: Users },
  { href: "/me", label: "ME", icon: User },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="shrink-0 pb-[21px] bg-surface-primary border-t border-border-light rounded-t-2xl shadow-[0_-2px_12px_#0000000A]">
      <div className="flex items-center h-14 px-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 h-full",
                active ? "text-fg-primary" : "text-fg-muted"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
