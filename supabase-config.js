/**
 * Hyrox Trainer — Supabase connection.
 *
 * These two values are SAFE to commit and ship publicly. The anon key is
 * designed to be used in client-side code; Row Level Security (see
 * supabase-schema.sql) is what actually protects each user's data.
 *
 * NEVER put the `service_role` key here — that one bypasses RLS.
 *
 * Find these in: Supabase Dashboard → Settings → API
 */
window.HYROX_SUPABASE = {
  url:     "https://wbqhzlqzbzvpjuboxeca.supabase.co",      // e.g. https://abcdefgh.supabase.co
  anonKey: "sb_publishable_7cYw5jFJK-XEtWHRm82xPQ_f4XKk_Dw"   // browser-safe publishable key
};
