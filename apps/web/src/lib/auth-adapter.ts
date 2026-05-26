import { createAuthenticationAdapter } from "@rainbow-me/rainbowkit";
import { createSiweMessage } from "viem/siwe";

type StringAuthenticationAdapter = ReturnType<
  typeof createAuthenticationAdapter<string>
>;

import { fetchNonce, postLogout, verifySiwe } from "@/lib/auth";
import { env } from "@/lib/env";
import { useSession } from "@/lib/session-store";

/**
 * RainbowKit SIWE adapter. After a wallet connects, RainbowKit prompts the user
 * to sign the message produced here; we verify it against apps/api and, on
 * success, persist the owner's session token.
 */
export const authenticationAdapter: StringAuthenticationAdapter =
  createAuthenticationAdapter({
  getNonce: fetchNonce,

  createMessage: ({ nonce, address, chainId }) => {
    const url = new URL(env.appUrl);
    return createSiweMessage({
      address: address as `0x${string}`,
      chainId,
      domain: url.host,
      nonce,
      uri: env.appUrl,
      version: "1",
      statement: "Sign in to Kronos Trader.",
    });
  },

  verify: async ({ message, signature }) => {
    const session = await verifySiwe(message, signature);
    if (!session) return false;
    useSession.getState().setSession(session.token, session.address);
    return true;
  },

  signOut: async () => {
    const { token, clear } = useSession.getState();
    if (token) await postLogout(token);
    clear();
  },
});
