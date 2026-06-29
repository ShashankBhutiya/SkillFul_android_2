import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Custom fetch with timeout to prevent "loading for too long"
const fetchWithTimeout = async (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

    // If the caller already provides a signal, abort ours when theirs aborts too
    if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (err: any) {
        clearTimeout(id);
        if (err.name === 'AbortError') {
            throw new Error('Connection timed out. The server might be unreachable or paused.');
        }
        throw err;
    }
};

// Only create a real client if credentials are provided
export const supabase =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                fetch: fetchWithTimeout
            }
        })
        : null;

/** Returns true if Supabase is properly configured */
export function isSupabaseConfigured(): boolean {
    return !!supabase;
}
