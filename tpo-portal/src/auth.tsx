import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

export interface AuthState {
    session: Session | null;
    userId: string | null;
    email: string | null;
    loading: boolean;
}

/**
 * Minimal Supabase session tracking.
 *
 * The student app's AuthContext carries guests, referrals, premium state and
 * streaks — none of which mean anything to a placement officer. The portal
 * only needs to know who is signed in, so it tracks the session and nothing else.
 */
export function useAuth(): AuthState {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
            setSession(next);
            setLoading(false);
        });

        return () => sub.subscription.unsubscribe();
    }, []);

    return {
        session,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        loading,
    };
}

export async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return "Supabase is not configured for this deployment.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
}

export async function signOut(): Promise<void> {
    await supabase?.auth.signOut();
}
