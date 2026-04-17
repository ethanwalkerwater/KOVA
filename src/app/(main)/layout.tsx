import { TabBar } from "@/components/ui";
import { ToastStack } from "@/components/ui/ToastStack";
import { CaptureSheet } from "@/components/capture/CaptureSheet";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh flex flex-col bg-surface-secondary">
      {/*
       * Each screen controls its own scrolling.
       * Screens that want full-height layouts (HomeScreen) set h-full + flex-col.
       * Screens that are simple scrolling pages use the natural document flow.
       * pb-[77px] ensures content is never hidden behind the TabBar.
       */}
      <main className="flex-1 overflow-y-auto pb-[77px] min-h-0">{children}</main>
      <TabBar />
      {/* CaptureSheet + Toasts — global, mounted once, controlled by UIStore */}
      <CaptureSheet />
      <ToastStack />
    </div>
  );
}
