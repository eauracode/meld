/**
 * Placeholder — replace by running `pnpm db:types` (root script) once
 * Supabase is reachable (local `supabase start` or a linked cloud project).
 * That command runs `supabase gen types typescript` and overwrites this
 * file with the real schema-derived types. Nothing else in packages/db
 * depends on the exact shape here beyond structural compatibility with
 * @supabase/supabase-js's generic, so this keeps createMeldClient() typed
 * and callable before the real types exist (10_IMPLEMENTATION_PLAN Phase 6).
 */
export type Database = {
  public: {
    Tables: Record<
      string,
      { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    >;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
  };
};
