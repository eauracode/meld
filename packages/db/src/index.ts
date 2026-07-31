import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./generated";

/**
 * Supabase client factory for all four apps.
 * - Browser/client contexts use the anon key (RLS is the security boundary).
 * - Edge Functions / server jobs use the service-role key — NEVER ship it to a client.
 * Typed against ./generated.ts — a placeholder until `pnpm db:types` runs
 * against a reachable Supabase project; the return type stays accurate
 * automatically once that file is regenerated.
 */

export type MeldSupabaseClient = SupabaseClient<Database>;

export interface MeldDbConfig {
  url: string;
  /** anon key for user-facing apps; service-role key for trusted server code only. */
  key: string;
}

export function createMeldClient(config: MeldDbConfig): MeldSupabaseClient {
  if (!config.url || !config.key) {
    throw new Error("Supabase url and key are required (check environment config)");
  }
  return createClient<Database>(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export type { Database };

/** Reads config from environment (NEXT_PUBLIC_* in apps, plain vars in functions). */
export function configFromEnv(env: Record<string, string | undefined>): MeldDbConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "";
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  return { url, key };
}
