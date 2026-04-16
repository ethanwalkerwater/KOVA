"use client";

import { useState, useEffect } from "react";
import { Signal, Wifi, BatteryFull } from "lucide-react";

export function StatusBar() {
  const [time, setTime] = useState("--:--");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between h-[62px] px-6 shrink-0">
      <span className="text-fg-primary font-semibold text-base">{time}</span>
      <div className="flex items-center gap-1.5">
        <Signal className="w-4 h-4 text-fg-primary" />
        <Wifi className="w-4 h-4 text-fg-primary" />
        <BatteryFull className="w-4 h-4 text-fg-primary" />
      </div>
    </div>
  );
}
