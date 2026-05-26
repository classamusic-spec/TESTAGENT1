"use client";

import { Bell, Mail, Smartphone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AlertEvent, useNotifyPrefs } from "@/lib/notify-prefs";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<AlertEvent, string> = {
  drawdownHalt: "Drawdown halt",
  tradeFill: "Trade fills",
  modelRollback: "Model rollback",
  killSwitch: "Kill switch",
};

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function NotificationPrefsPanel() {
  const prefs = useNotifyPrefs();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          Alerts &amp; notifications
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Choose channels and events. Delivery runs server-side once a provider is configured.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={prefs.email}
              onChange={(e) => prefs.setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            />
            <Toggle
              on={prefs.emailEnabled}
              onClick={() => prefs.setChannel("emailEnabled", !prefs.emailEnabled)}
              label="Enable email alerts"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
            <span className="flex items-center gap-3 text-sm">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Push notifications
            </span>
            <Toggle
              on={prefs.pushEnabled}
              onClick={() => prefs.setChannel("pushEnabled", !prefs.pushEnabled)}
              label="Enable push notifications"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Events</p>
          <div className="space-y-1.5">
            {(Object.keys(EVENT_LABELS) as AlertEvent[]).map((event) => (
              <div
                key={event}
                className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm"
              >
                <span>{EVENT_LABELS[event]}</span>
                <Toggle
                  on={prefs.events[event]}
                  onClick={() => prefs.toggleEvent(event)}
                  label={`Toggle ${EVENT_LABELS[event]}`}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
