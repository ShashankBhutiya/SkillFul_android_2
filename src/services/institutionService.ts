/**
 * Institution enrolment: attaches a student to their college by join code.
 *
 * All writes go through the join_institution RPC rather than a direct insert.
 * The server resolves the code, so the client never handles an institution id
 * and cannot add itself to a college it was not given the code for.
 *
 * The code a student's placement cell hands out also travels in a link as
 * ?join=CODE, mirroring how ?ref= already works for referrals.
 */
import { supabase } from "@/lib/supabase";

export const PENDING_JOIN_KEY = "pending_join_code";

export interface MyInstitution {
    institutionName: string;
    code: string;
    role: "student" | "tpo";
    rollNumber?: string;
    branch?: string;
    batchYear?: number;
}

export interface JoinDetails {
    rollNumber?: string;
    branch?: string;
    batchYear?: number;
}

export type JoinError = "invalid_code" | "not_authenticated" | "unavailable";

/**
 * Deliberately one flat shape rather than a discriminated union: this project
 * compiles with `strict: false`, where boolean-literal discriminants widen to
 * `boolean` and `if (!result.ok)` fails to narrow.
 */
export interface JoinResult {
    ok: boolean;
    /** Set when ok is false. */
    error?: JoinError;
    /** Set when ok is true. */
    institutionName?: string;
    /** True when the caller is this institution's TPO, not a student. */
    alreadyStaff?: boolean;
}

/** Human-readable text for each failure the RPC can report. */
export const JOIN_ERROR_TEXT: Record<JoinError, string> = {
    invalid_code:
        "We couldn't find a college with that code. Check it with your placement cell.",
    not_authenticated: "Sign in first, then enter your college code.",
    unavailable: "Couldn't reach the server. Please try again.",
};

/** Enrol the signed-in user as a student of the college holding this code. */
export async function joinInstitution(
    code: string,
    details: JoinDetails = {}
): Promise<JoinResult> {
    if (!supabase) return { ok: false, error: "unavailable" };

    try {
        const { data, error } = await supabase.rpc("join_institution", {
            p_code: code,
            p_roll_number: details.rollNumber ?? null,
            p_branch: details.branch ?? null,
            p_batch_year: details.batchYear ?? null,
        });

        if (error || !data) {
            console.warn("[institutionService] join failed:", error);
            return { ok: false, error: "unavailable" };
        }

        if (!data.ok) {
            const reason: JoinError =
                data.error === "not_authenticated" ? "not_authenticated" : "invalid_code";
            return { ok: false, error: reason };
        }

        return {
            ok: true,
            institutionName: data.institution_name,
            alreadyStaff: !!data.already_staff,
        };
    } catch (err) {
        console.warn("[institutionService] join threw:", err);
        return { ok: false, error: "unavailable" };
    }
}

/** Which college is the signed-in user attached to, if any. */
export async function fetchMyInstitution(): Promise<MyInstitution | null> {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase.rpc("my_institution");
        if (error || !data) return null;

        return {
            institutionName: data.institution_name,
            code: data.code,
            role: data.role,
            rollNumber: data.roll_number ?? undefined,
            branch: data.branch ?? undefined,
            batchYear: data.batch_year ?? undefined,
        };
    } catch (err) {
        console.warn("[institutionService] lookup failed:", err);
        return null;
    }
}

/**
 * Applies a code captured from a ?join= link once the user is signed in.
 * Clears the pending code either way so a bad one is not retried forever.
 */
export async function applyPendingJoinCode(): Promise<JoinResult | null> {
    let pending: string | null = null;
    try {
        pending = localStorage.getItem(PENDING_JOIN_KEY);
    } catch {
        return null;
    }
    if (!pending) return null;

    const result = await joinInstitution(pending);

    // Keep it only when the server was unreachable — that is worth retrying.
    if (result.ok || result.error !== "unavailable") {
        try {
            localStorage.removeItem(PENDING_JOIN_KEY);
        } catch {
            /* storage unavailable; nothing to clean up */
        }
    }

    return result;
}
