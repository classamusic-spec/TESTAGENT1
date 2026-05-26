import { describe, expect, it } from "vitest";

import { cn, formatPrice, shortenAddress } from "@/lib/utils";

describe("shortenAddress", () => {
  it("shortens a full EVM address", () => {
    expect(shortenAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234…5678",
    );
  });

  it("respects a custom char count", () => {
    expect(shortenAddress("0x1234567890abcdef1234567890abcdef12345678", 6)).toBe(
      "0x123456…345678",
    );
  });

  it("returns short strings unchanged", () => {
    expect(shortenAddress("0x1234")).toBe("0x1234");
  });
});

describe("cn", () => {
  it("merges and dedupes tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatPrice", () => {
  it("uses fewer decimals for large prices and more for small", () => {
    expect(formatPrice(64000)).toBe("$64,000.00");
    expect(formatPrice(0.000024)).toBe("$0.00002400");
  });
});
