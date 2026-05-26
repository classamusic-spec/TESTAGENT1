import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type TradingPair } from "@kronos/shared";

/**
 * Per-asset enable/disable preference. This is a UI gate the user controls: a
 * disabled asset is paused for trading in the client. It only ever *narrows*
 * what the bot trades — it cannot add pairs outside the human-set universe
 * (invariant 3). Disabled by exclusion: anything not listed here is enabled.
 */
interface AssetPrefsState {
  disabled: Record<string, true>;
  isEnabled: (pair: TradingPair) => boolean;
  toggle: (pair: TradingPair) => void;
  setEnabled: (pair: TradingPair, enabled: boolean) => void;
}

export const useAssetPrefs = create<AssetPrefsState>()(
  persist(
    (set, get) => ({
      disabled: {},
      isEnabled: (pair) => !get().disabled[pair],
      toggle: (pair) =>
        set((state) => {
          const disabled = { ...state.disabled };
          if (disabled[pair]) delete disabled[pair];
          else disabled[pair] = true;
          return { disabled };
        }),
      setEnabled: (pair, enabled) =>
        set((state) => {
          const disabled = { ...state.disabled };
          if (enabled) delete disabled[pair];
          else disabled[pair] = true;
          return { disabled };
        }),
    }),
    { name: "kronos-asset-prefs" },
  ),
);
