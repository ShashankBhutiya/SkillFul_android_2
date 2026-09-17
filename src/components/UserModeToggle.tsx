import { useState } from "react";
import { GraduationCap, Briefcase, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/hooks/useUserMode";
import { USER_MODES, type UserMode } from "@/config/userMode";
import { hapticLight } from "@/hooks/useHaptics";

const MODE_ICONS: Record<UserMode, typeof GraduationCap> = {
    student: GraduationCap,
    professional: Briefcase,
};

/** Short labels — the full ones are too long for a segmented control. */
const SHORT_LABELS: Record<UserMode, string> = {
    student: "Student",
    professional: "Professional",
};

interface UserModeToggleProps {
    /** Renders the "I am a" caption above the control. */
    showLabel?: boolean;
    /** Header use: hide the text labels on narrow phones so only icons show. */
    compact?: boolean;
    className?: string;
}

/**
 * Compact segmented Student / Professional switch for the profile menu.
 *
 * Deliberately available to guests too: the mode is chosen before signup, so
 * a guest who picked wrong must be able to correct it without an account.
 * Switching only changes which categories are visible — see updateUserMode.
 */
const UserModeToggle = ({ showLabel = true, compact = false, className = "" }: UserModeToggleProps) => {
    const { updateUserMode } = useAuth();
    const { mode } = useUserMode();
    const [saving, setSaving] = useState(false);

    const handleSelect = async (next: UserMode) => {
        if (next === mode || saving) return;
        hapticLight();
        setSaving(true);
        try {
            await updateUserMode(next);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={className}>
            {showLabel && (
                <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        I am a
                    </p>
                    {saving && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                </div>
            )}

            <div
                role="group"
                aria-label="Switch between Student and Professional"
                className="flex divide-x divide-border border border-border bg-background"
            >
                {USER_MODES.map((option) => {
                    const Icon = MODE_ICONS[option.value];
                    const selected = mode === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            disabled={saving}
                            aria-pressed={selected}
                            onClick={() => handleSelect(option.value)}
                            className={`flex flex-1 items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${selected
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className={compact ? "hidden truncate min-[400px]:inline" : "truncate"}>
                                {SHORT_LABELS[option.value]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default UserModeToggle;
