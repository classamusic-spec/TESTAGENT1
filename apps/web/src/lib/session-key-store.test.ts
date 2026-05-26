import { afterEach, describe, expect, it } from "vitest";

import { useSessionKey } from "@/lib/session-key-store";

afterEach(() => {
  useSessionKey.getState().revoke();
});

describe("useSessionKey", () => {
  it("starts with no granted key", () => {
    expect(useSessionKey.getState().grant).toBeNull();
  });

  it("stores a grant and clears it on revoke", () => {
    useSessionKey.getState().grantKey({
      keyAddress: "0x1234567890abcdef1234567890abcdef12345678",
      spendCapUsd: 500,
      validUntil: Date.now() + 1000,
    });
    expect(useSessionKey.getState().grant?.spendCapUsd).toBe(500);

    useSessionKey.getState().revoke();
    expect(useSessionKey.getState().grant).toBeNull();
  });
});
