import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";

type RenderArgs = Parameters<
  Parameters<typeof import("@rainbow-me/rainbowkit")["ConnectButton"]["Custom"]>[0]["children"]
>[0];

const openConnectModal = vi.fn();

vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (args: RenderArgs) => ReactNode }) =>
      children({
        account: undefined,
        chain: undefined,
        openAccountModal: vi.fn(),
        openChainModal: vi.fn(),
        openConnectModal,
        openProfile: vi.fn(),
        accountModalOpen: false,
        chainModalOpen: false,
        connectModalOpen: false,
        mounted: true,
        authenticationStatus: undefined,
      } as unknown as RenderArgs),
  },
}));

describe("ConnectWalletButton", () => {
  it("renders a connect prompt when no wallet is connected", () => {
    render(<ConnectWalletButton />);
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });
});
