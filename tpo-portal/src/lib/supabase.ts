import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/**
 * Points at the same Supabase project as the student app — the portal is a
 * separate site, not a separate backend. Null when unconfigured so the
 * dashboard can fall back to its sample cohort instead of crashing.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = () => !!supabase;
