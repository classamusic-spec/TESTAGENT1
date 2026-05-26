import { env } from "@/lib/env";

/** Kill-switch client. Halting requires the owner's session token. */
export async function haltTrading(token: string, reason = "manual kill switch"): Promise<boolean> {
  const res = await fetch(`${env.apiUrl}/control/halt`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

export async function resumeTrading(token: string): Promise<boolean> {
  const res = await fetch(`${env.apiUrl}/control/resume`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  return Boolean(res?.ok);
}
