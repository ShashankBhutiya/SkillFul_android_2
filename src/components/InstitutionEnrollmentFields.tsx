import { useEffect, useState } from "react";
import { Building2, KeyRound, Loader2 } from "lucide-react";
import {
    listAvailableInstitutions,
    type AvailableInstitution,
    type StudentCodeClaim,
} from "@/services/institutionService";

export interface InstitutionEnrollmentValue {
    institutionId: string;
    code: string;
    degree: string;
    academicYear: string;
}

export const emptyInstitutionEnrollment: InstitutionEnrollmentValue = {
    institutionId: "",
    code: "",
    degree: "",
    academicYear: "",
};

export function toStudentCodeClaim(value: InstitutionEnrollmentValue): StudentCodeClaim | null {
    if (!value.institutionId || !value.code.trim()) return null;
    return {
        institutionId: value.institutionId,
        code: value.code.trim().toUpperCase(),
        degree: value.degree,
        academicYear: value.academicYear,
    };
}

export function InstitutionEnrollmentFields({
    value,
    onChange,
    disabled = false,
}: {
    value: InstitutionEnrollmentValue;
    onChange: (next: InstitutionEnrollmentValue) => void;
    disabled?: boolean;
}) {
    const [institutions, setInstitutions] = useState<AvailableInstitution[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        let active = true;
        listAvailableInstitutions()
            .then((items) => {
                if (active) setInstitutions(items);
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
    }, []);

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

            <label className="block space-y-1">
                <span className="text-xs font-bold text-muted-foreground">College</span>
                <select
                    value={value.institutionId}
                    onChange={(event) => change("institutionId", event.target.value)}
                    disabled={disabled || loading}
                    className="h-11 w-full rounded-xl border border-white/10 bg-muted/30 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                >
                    <option value="">{loading ? "Loading colleges…" : "Select your college"}</option>
                    {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                            {institution.name}{institution.city ? ` — ${institution.city}` : ""}
                        </option>
                    ))}
                </select>
            </label>

            <label className="block space-y-1">
                <span className="text-xs font-bold text-muted-foreground">Student code</span>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={value.code}
                        onChange={(event) => change("code", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        disabled={disabled}
                        maxLength={20}
                        placeholder="Code from your TPO"
                        className="h-11 w-full rounded-xl border border-white/10 bg-muted/30 pl-10 pr-3 font-mono text-sm tracking-wider text-foreground outline-none placeholder:font-sans placeholder:tracking-normal focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                    />
                </div>
            </label>

            <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                    <span className="text-xs font-bold text-muted-foreground">Degree</span>
                    <input value={value.degree} onChange={(event) => change("degree", event.target.value)} disabled={disabled} maxLength={100} placeholder="e.g. B.Tech" className="h-11 w-full rounded-xl border border-white/10 bg-muted/30 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60" />
                </label>
                <label className="block space-y-1">
                    <span className="text-xs font-bold text-muted-foreground">Academic year</span>
                    <input value={value.academicYear} onChange={(event) => change("academicYear", event.target.value)} disabled={disabled} maxLength={40} placeholder="e.g. 3rd year" className="h-11 w-full rounded-xl border border-white/10 bg-muted/30 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60" />
                </label>
            </div>

            {loadError && <p className="text-[11px] text-destructive">{loadError}</p>}
            {loading && <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading colleges</p>}
        </div>
    );
}
