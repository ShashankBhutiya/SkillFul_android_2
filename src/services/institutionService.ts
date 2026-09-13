import { supabase } from "@/lib/supabase";

export interface AvailableInstitution {
    id: string;
    name: string;
    city: string | null;
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

export async function claimStudentCode(claim: StudentCodeClaim, userId?: string): Promise<string> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.rpc("claim_student_access_code", {
        p_institution_id: claim.institutionId,
        p_code: claim.code,
        p_roll_number: claim.rollNumber.trim(),
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
