import { env } from "@/lib/env";

/** Thin client for the apps/api SIWE endpoints. */

export async function fetchNonce(): Promise<string> {
  const res = await fetch(`${env.apiUrl}/auth/nonce`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed to fetch nonce");
  const data = (await res.json()) as { nonce: string };
  return data.nonce;
}

export async function verifySiwe(
  message: string,
  signature: string,
): Promise<{ token: string; address: string } | null> {
  const res = await fetch(`${env.apiUrl}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { token: string; address: string };
}

export async function fetchMe(token: string): Promise<string | null> {
  const res = await fetch(`${env.apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { address: string };
  return data.address;
}

export async function postLogout(token: string): Promise<void> {
  await fetch(`${env.apiUrl}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}
