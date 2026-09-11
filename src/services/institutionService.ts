import { supabase } from "@/lib/supabase";

export interface AvailableInstitution {
    id: string;
    name: string;
    city: string | null;
}

export interface StudentCodeClaim {
    institutionId: string;
    code: string;
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

export async function claimStudentCode(claim: StudentCodeClaim): Promise<string> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.rpc("claim_student_access_code", {
        p_institution_id: claim.institutionId,
        p_code: claim.code,
        p_degree: claim.degree?.trim() || null,
        p_academic_year: claim.academicYear?.trim() || null,
    });
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
