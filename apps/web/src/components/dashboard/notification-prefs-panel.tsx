"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  GitBranch,
  Mail,
  OctagonX,
  Receipt,
  Smartphone,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AlertEvent, useNotifyPrefs } from "@/lib/notify-prefs";
import { cn } from "@/lib/utils";

const EVENTS: { key: AlertEvent; label: string; icon: LucideIcon }[] = [
  { key: "drawdownHalt", label: "Drawdown halt", icon: TrendingDown },
  { key: "tradeFill", label: "Trade fills", icon: Receipt },
  { key: "modelRollback", label: "Model rollback", icon: GitBranch },
  { key: "killSwitch", label: "Kill switch", icon: OctagonX },
  { key: "dailySummary", label: "Daily summary", icon: CalendarDays },
  { key: "forecastAnomaly", label: "Forecast anomaly", icon: AlertTriangle },
  { key: "systemStatus", label: "System status", icon: Activity },
  { key: "newModelVersion", label: "New model version", icon: Sparkles },
];

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}
    >
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", on ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

export function NotificationPrefsPanel() {
  const prefs = useNotifyPrefs();
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> Alerts &amp; notifications
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose channels and events. Delivery runs server-side once a provider is configured.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            value={prefs.email}
            onChange={(e) => prefs.setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Switch on={prefs.emailEnabled} onClick={() => prefs.setChannel("emailEnabled", !prefs.emailEnabled)} label="Enable email" />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2.5">
            <Smartphone className="h-4 w-4 text-muted-foreground" /> Push notifications
          </span>
          <Switch on={prefs.pushEnabled} onClick={() => prefs.setChannel("pushEnabled", !prefs.pushEnabled)} label="Enable push" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Events</p>
            <button
              type="button"
              onClick={() => prefs.setAllEvents(true)}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Select all
            </button>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {EVENTS.map((e) => (
              <div key={e.key} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-sm">
                <span className="flex items-center gap-2.5">
                  <e.icon className="h-4 w-4 text-muted-foreground" /> {e.label}
                </span>
                <Switch on={prefs.events[e.key]} onClick={() => prefs.toggleEvent(e.key)} label={`Toggle ${e.label}`} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
