import { useEffect, useState } from "react";
import { AlertCircle, Building2, KeyRound, Loader2, RefreshCw } from "lucide-react";
import {
    listAvailableInstitutions,
    type AvailableInstitution,
    type StudentCodeClaim,
} from "@/services/institutionService";

export interface InstitutionEnrollmentValue {
    institutionId: string;
    code: string;
    rollNumber: string;
}

export const emptyInstitutionEnrollment: InstitutionEnrollmentValue = {
    institutionId: "",
    code: "",
    rollNumber: "",
};

export type InstitutionEnrollmentErrors = Partial<Record<keyof InstitutionEnrollmentValue, string>>;

export function validateInstitutionEnrollment(value: InstitutionEnrollmentValue): InstitutionEnrollmentErrors {
    const errors: InstitutionEnrollmentErrors = {};
    const code = value.code.trim();

    if (!value.institutionId) errors.institutionId = "Select your college.";
    if (!code) errors.code = "Enter the student code from your TPO.";
    else if (code.length !== 20) errors.code = "Student codes contain 20 letters and numbers.";
    if (!value.rollNumber.trim()) errors.rollNumber = "Enter your college roll number.";

    return errors;
}

export function toStudentCodeClaim(
    value: InstitutionEnrollmentValue,
    academicDetails?: Pick<StudentCodeClaim, "degree" | "academicYear">,
): StudentCodeClaim | null {
    if (!value.institutionId || !value.code.trim() || !value.rollNumber.trim()) return null;
    return {
        institutionId: value.institutionId,
        code: value.code.trim().toUpperCase(),
        rollNumber: value.rollNumber.trim().toUpperCase(),
        ...academicDetails,
    };
}

export function InstitutionEnrollmentFields({
    value,
    onChange,
    disabled = false,
    errors = {},
}: {
    value: InstitutionEnrollmentValue;
    onChange: (next: InstitutionEnrollmentValue) => void;
    disabled?: boolean;
    errors?: InstitutionEnrollmentErrors;
}) {
    const [institutions, setInstitutions] = useState<AvailableInstitution[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [loadAttempt, setLoadAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError("");
        listAvailableInstitutions()
            .then((items) => {
                if (!active) return;
                setInstitutions(items);
                if (!items.length) setLoadError("No colleges are available right now. Try again later.");
            })
            .catch(() => {
                if (active) setLoadError("Colleges are unavailable right now. Try again later.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [loadAttempt]);

    const change = (field: keyof InstitutionEnrollmentValue, nextValue: string) =>
        onChange({ ...value, [field]: nextValue });

    return (
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                    <p className="text-xs font-bold text-foreground">Join your college placement cohort</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                        Select your college and enter the one-time code given by your TPO. Codes from another college are rejected.
                    </p>
                </div>
            </div>

            <div className="block space-y-1">
                <label htmlFor="college-institution" className="text-xs font-bold text-muted-foreground">College</label>
                <select
                    id="college-institution"
                    aria-describedby={errors.institutionId ? "college-institution-error" : undefined}
                    aria-invalid={!!errors.institutionId}
                    value={value.institutionId}
                    onChange={(event) => change("institutionId", event.target.value)}
                    disabled={disabled || loading}
                    className={`h-11 w-full rounded-xl border bg-muted/30 px-3 text-sm text-foreground outline-none focus:ring-2 disabled:opacity-60 ${errors.institutionId ? "border-destructive/60 focus:ring-destructive/30" : "border-white/10 focus:ring-primary/50"}`}
                >
                    <option value="">{loading ? "Loading colleges…" : "Select your college"}</option>
                    {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                            {institution.name}{institution.city ? ` — ${institution.city}` : ""}
                        </option>
                    ))}
                </select>
                {errors.institutionId && <p id="college-institution-error" className="text-[11px] text-destructive">{errors.institutionId}</p>}
            </div>

            <div className="block space-y-1">
                <label htmlFor="college-student-code" className="text-xs font-bold text-muted-foreground">Student code</label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        id="college-student-code"
                        aria-describedby={errors.code ? "college-student-code-error" : undefined}
                        aria-invalid={!!errors.code}
                        value={value.code}
                        onChange={(event) => change("code", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        disabled={disabled}
                        maxLength={20}
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Code from your TPO"
                        className={`h-11 w-full rounded-xl border bg-muted/30 pl-10 pr-3 font-mono text-sm tracking-wider text-foreground outline-none placeholder:font-sans placeholder:tracking-normal focus:ring-2 disabled:opacity-60 ${errors.code ? "border-destructive/60 focus:ring-destructive/30" : "border-white/10 focus:ring-primary/50"}`}
                    />
                </div>
                {errors.code && <p id="college-student-code-error" className="text-[11px] text-destructive">{errors.code}</p>}
            </div>

            <div className="block space-y-1">
                <label htmlFor="college-roll-number" className="text-xs font-bold text-muted-foreground">Roll number</label>
                <input
                    id="college-roll-number"
                    aria-describedby={errors.rollNumber ? "college-roll-number-error" : undefined}
                    aria-invalid={!!errors.rollNumber}
                    value={value.rollNumber}
                    onChange={(event) => change("rollNumber", Array.from(event.target.value.toUpperCase())
                        .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
                        .join(""))}
                    disabled={disabled}
                    maxLength={40}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="e.g. 22CSE104"
                    className={`h-11 w-full rounded-xl border bg-muted/30 px-3 font-mono text-sm text-foreground outline-none placeholder:font-sans focus:ring-2 disabled:opacity-60 ${errors.rollNumber ? "border-destructive/60 focus:ring-destructive/30" : "border-white/10 focus:ring-primary/50"}`}
                />
                {errors.rollNumber && <p id="college-roll-number-error" className="text-[11px] text-destructive">{errors.rollNumber}</p>}
            </div>

            {loadError && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] text-destructive" role="alert">
                    <span className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{loadError}</span>
                    <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} disabled={disabled || loading} className="flex shrink-0 items-center gap-1 font-bold hover:underline disabled:opacity-60">
                        <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                </div>
            )}
            {loading && <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading colleges</p>}
        </div>
    );
}
