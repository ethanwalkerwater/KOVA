import { TabBar } from "@/components/ui";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-surface-secondary">
      <main className="flex-1 overflow-y-auto pb-[77px]">{children}</main>
      <TabBar />
    </div>
  );
}
