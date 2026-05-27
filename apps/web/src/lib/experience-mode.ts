import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * UI experience level. "Newbie" hides all tuning and lets the AI engine drive
 * from a deposit + risk preset; "Advanced" exposes every knob. Default is
 * newbie — the product is "add funds and let the bot do its thing."
 */
export type ExperienceMode = "newbie" | "advanced";

interface ExperienceState {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
}

export const useExperienceMode = create<ExperienceState>()(
  persist(
    (set) => ({
      mode: "newbie",
      setMode: (mode) => set({ mode }),
    }),
    { name: "lodestar-experience-mode" },
  ),
);
