import { z } from "zod";

/**
 * zod-validated public env parsing (CLAUDE.md coding standards: no magic
 * strings, env validated at the boundary). Only NEXT_PUBLIC_* vars are
 * available in the browser, so we read them explicitly rather than via a
 * dynamic loop (Next inlines them at build time).
 */
const clientEnvSchema = z.object({
  walletConnectProjectId: z.string().min(1).default("demo"),
  appUrl: z.string().url().default("http://localhost:3000"),
  apiUrl: z.string().url().default("http://localhost:8000"),
});

export const env = clientEnvSchema.parse({
  walletConnectProjectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? undefined,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? undefined,
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? undefined,
});
