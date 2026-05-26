import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchMe, fetchNonce, verifySiwe } from "@/lib/auth";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(response: { ok: boolean; json?: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => response.json,
  } as Response);
}

describe("auth client", () => {
  it("fetchNonce returns the nonce string", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: true, json: { nonce: "abc123def456" } }));
    await expect(fetchNonce()).resolves.toBe("abc123def456");
  });

  it("fetchNonce throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false }));
    await expect(fetchNonce()).rejects.toThrow(/nonce/);
  });

  it("verifySiwe returns the session on success", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ok: true, json: { token: "jwt.token.here", address: "0xowner" } }),
    );
    await expect(verifySiwe("message", "0xsig")).resolves.toEqual({
      token: "jwt.token.here",
      address: "0xowner",
    });
  });

  it("verifySiwe returns null when the owner check fails", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false }));
    await expect(verifySiwe("message", "0xsig")).resolves.toBeNull();
  });

  it("fetchMe returns null for an invalid token", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false }));
    await expect(fetchMe("bad")).resolves.toBeNull();
  });
});
