import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Notification preferences (channels + which events to deliver). This is the UX
 * layer; actual delivery is performed server-side by the notifier seam in
 * apps/api/src/ops (a provider such as SES / web-push is wired at deployment).
 */
export type AlertEvent = "drawdownHalt" | "tradeFill" | "modelRollback" | "killSwitch";

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
}

export const DEFAULT_EVENTS: Record<AlertEvent, boolean> = {
  drawdownHalt: true,
  tradeFill: false,
  modelRollback: true,
  killSwitch: true,
};

export const useNotifyPrefs = create<NotifyPrefsState>()(
  persist(
    (set) => ({
      email: "",
      emailEnabled: false,
      pushEnabled: false,
      events: { ...DEFAULT_EVENTS },
      setEmail: (email) => set({ email }),
      setChannel: (channel, on) => set({ [channel]: on } as Partial<NotifyPrefsState>),
      toggleEvent: (event) =>
        set((state) => ({ events: { ...state.events, [event]: !state.events[event] } })),
    }),
    { name: "kronos-notify-prefs" },
  ),
);
