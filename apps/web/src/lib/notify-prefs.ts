import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Notification preferences (channels + which events to deliver). This is the UX
 * layer; actual delivery is performed server-side by the notifier seam in
 * apps/api/src/ops (a provider such as SES / web-push is wired at deployment).
 */
export type AlertEvent =
  | "drawdownHalt"
  | "tradeFill"
  | "modelRollback"
  | "killSwitch"
  | "dailySummary"
  | "forecastAnomaly"
  | "systemStatus"
  | "newModelVersion";

export interface NotifyPrefs {
  email: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  events: Record<AlertEvent, boolean>;
}

interface NotifyPrefsState extends NotifyPrefs {
  setEmail: (email: string) => void;
  setChannel: (channel: "emailEnabled" | "pushEnabled", on: boolean) => void;
  toggleEvent: (event: AlertEvent) => void;
  setAllEvents: (on: boolean) => void;
}

export const DEFAULT_EVENTS: Record<AlertEvent, boolean> = {
  drawdownHalt: true,
  tradeFill: true,
  modelRollback: true,
  killSwitch: true,
  dailySummary: true,
  forecastAnomaly: true,
  systemStatus: true,
  newModelVersion: true,
};

export const useNotifyPrefs = create<NotifyPrefsState>()(
  persist(
    (set) => ({
      email: "",
      emailEnabled: false,
      pushEnabled: true,
      events: { ...DEFAULT_EVENTS },
      setEmail: (email) => set({ email }),
      setChannel: (channel, on) => set({ [channel]: on } as Partial<NotifyPrefsState>),
      toggleEvent: (event) =>
        set((state) => ({ events: { ...state.events, [event]: !state.events[event] } })),
      setAllEvents: (on) =>
        set((state) => ({
          events: Object.fromEntries(Object.keys(state.events).map((k) => [k, on])) as Record<AlertEvent, boolean>,
        })),
    }),
    { name: "kronos-notify-prefs" },
  ),
);
