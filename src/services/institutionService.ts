import { supabase } from "@/lib/supabase";

export interface AvailableInstitution {
    id: string;
    name: string;
    city: string | null;
}

export interface LinkedInstitution {
    id: string;
    name: string;
    city: string | null;
    rollNumber: string | null;
}

export interface StudentCodeClaim {
    institutionId: string;
    code: string;
    rollNumber: string;
    degree?: string;
    academicYear?: string;
}

const PENDING_CLAIM_KEY = "pending_student_code_claim";

export async function listAvailableInstitutions(): Promise<AvailableInstitution[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc("list_available_institutions");
    if (error) throw error;
    return (data ?? []) as AvailableInstitution[];
}

export function formatStudentCodeClaimError(error: any): string {
    const message = typeof error?.message === "string" ? error.message : "";
    const details = typeof error?.details === "string" ? error.details : "";
    const text = `${message} ${details}`;

    if (/invalid for the selected college/i.test(text)) {
        return "This student code was not accepted. Check that you selected the right college and entered an unused code from your TPO.";
    }
    if (/already linked to another college/i.test(text)) {
        return "Your account is already linked to another college. Exit your current college first, or ask your TPO to reset your access.";
    }
    if (/roll number/i.test(text)) {
        return "Enter your roll number before linking your college.";
    }
    if (/sign in/i.test(text)) {
        return "Sign in before entering your student code.";
    }
    if (/network|failed to fetch|fetch failed|timed out|abort/i.test(text)) {
        return "We could not reach the college server. Check your connection and try again.";
    }

    return message || "The college link could not be completed. Check your details and try again.";
}

export async function getLinkedInstitution(): Promise<LinkedInstitution | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("get_my_linked_college");
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    return {
        id: row.institution_id,
        name: row.institution_name,
        city: row.city ?? null,
        rollNumber: row.roll_number ?? null,
    };
}

export async function claimStudentCode(claim: StudentCodeClaim, userId?: string): Promise<string> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const institutionId = claim.institutionId.trim();
    const code = claim.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const rollNumber = claim.rollNumber.trim();
    if (!institutionId || !code || !rollNumber) {
        throw new Error("Select your college and enter both your student code and roll number.");
    }
    const { data, error } = await supabase.rpc("claim_student_access_code", {
        p_institution_id: institutionId,
        p_code: code,
        p_roll_number: rollNumber,
        p_degree: claim.degree?.trim() || null,
        p_academic_year: claim.academicYear?.trim() || null,
    });
    if (error) throw error;
    if (userId && (claim.degree?.trim() || claim.academicYear?.trim())) {
        const { data: profile, error: readError } = await supabase
            .from("profiles")
            .select("degree,academic_year")
            .eq("id", userId)
            .maybeSingle();
        if (readError) {
            console.warn("College linked, but academic profile details could not be read:", readError);
        } else {
            const details = {
                ...(!profile?.degree?.trim() && claim.degree?.trim() ? { degree: claim.degree.trim() } : {}),
                ...(!profile?.academic_year?.trim() && claim.academicYear?.trim() ? { academic_year: claim.academicYear.trim() } : {}),
            };
            if (Object.keys(details).length) {
                const { error: profileError } = await supabase.from("profiles").update(details).eq("id", userId);
                if (profileError) console.warn("College linked, but academic profile details could not be saved:", profileError);
            }
        }
    }
    return data?.[0]?.institution_name ?? "your college";
}

export async function leaveStudentCollege(): Promise<string> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.rpc("leave_student_college");
    if (error) throw error;
    return data?.[0]?.institution_name ?? "your college";
}

export function storePendingStudentCodeClaim(claim: StudentCodeClaim) {
    localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify(claim));
}

export function readPendingStudentCodeClaim(): StudentCodeClaim | null {
    try {
        const value = localStorage.getItem(PENDING_CLAIM_KEY);
        if (!value) return null;
        const parsed = JSON.parse(value) as StudentCodeClaim;
        return parsed.institutionId && parsed.code ? parsed : null;
    } catch {
        return null;
    }
}

export function clearPendingStudentCodeClaim() {
    localStorage.removeItem(PENDING_CLAIM_KEY);
}
