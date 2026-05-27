"use client";

import { Gauge, Sparkles } from "lucide-react";

import { type ExperienceMode, useExperienceMode } from "@/lib/experience-mode";
import { cn } from "@/lib/utils";

const OPTIONS: { mode: ExperienceMode; label: string; icon: typeof Sparkles }[] = [
  { mode: "newbie", label: "Simple", icon: Sparkles },
  { mode: "advanced", label: "Advanced", icon: Gauge },
];

export function ExperienceToggle() {
  const mode = useExperienceMode((s) => s.mode);
  const setMode = useExperienceMode((s) => s.setMode);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-secondary/40 p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.mode}
          type="button"
          onClick={() => setMode(o.mode)}
          aria-pressed={mode === o.mode}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            mode === o.mode ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <o.icon className="h-3.5 w-3.5" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
