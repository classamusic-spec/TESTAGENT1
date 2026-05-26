import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GoLiveDialog } from "@/components/dashboard/go-live-dialog";
import { useTradingMode } from "@/lib/store";

afterEach(() => {
  useTradingMode.getState().setMode("paper");
});

describe("GoLiveDialog (invariant 2: explicit opt-in)", () => {
  it("keeps the confirm button disabled until risks are acknowledged", () => {
    render(<GoLiveDialog open onClose={() => {}} />);
    const confirm = screen.getByRole("button", { name: /enable live trading/i });
    expect(confirm).toBeDisabled();
    expect(useTradingMode.getState().mode).toBe("paper");
  });

  it("switches to live only after acknowledging and confirming", () => {
    render(<GoLiveDialog open onClose={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox"));
    const confirm = screen.getByRole("button", { name: /enable live trading/i });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(useTradingMode.getState().mode).toBe("live");
  });

  it("does not change mode when cancelled", () => {
    render(<GoLiveDialog open onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(useTradingMode.getState().mode).toBe("paper");
  });
});
