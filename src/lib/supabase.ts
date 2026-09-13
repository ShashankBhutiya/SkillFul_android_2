import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Custom fetch with timeout to prevent "loading for too long"
const fetchWithTimeout = async (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    const requestUrl = typeof url === "string" ? url : url.toString();
    // AI generation commonly takes longer than an ordinary database request.
    // Aborting it after six seconds made the SDK report the misleading generic
    // "Failed to send a request to the Edge Function" message.
    const timeoutMs = requestUrl.includes("/functions/v1/generate-practice")
        ? 90_000
        : 30_000;
    const id = setTimeout(() => controller.abort(), timeoutMs);

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
            throw new Error('The request timed out. Please check your connection and try again.');
        }
        throw err;
    }
};

// Only create a real client if credentials are provided
export const supabase =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                flowType: "pkce",
            },
            global: {
                fetch: fetchWithTimeout
            }
        })
        : null;

/** Returns true if Supabase is properly configured */
export function isSupabaseConfigured(): boolean {
    return !!supabase;
}
