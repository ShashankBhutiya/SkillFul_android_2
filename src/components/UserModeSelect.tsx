import { motion } from "framer-motion";
import { GraduationCap, Briefcase, Check } from "lucide-react";
import { USER_MODES, type UserMode } from "@/config/userMode";
import { hapticLight } from "@/hooks/useHaptics";

const MODE_ICONS: Record<UserMode, typeof GraduationCap> = {
    student: GraduationCap,
    professional: Briefcase,
};

interface UserModeSelectProps {
    value: UserMode | null;
    onChange: (mode: UserMode) => void;
    /** "cards" for onboarding/signup, "rows" for the settings list. */
    variant?: "cards" | "rows";
    disabled?: boolean;
}

/**
 * Student vs Professional picker.
 *
 * Shared by the signup step and Profile Settings so the wording of the choice
 * is identical in both places — a user switching later should recognise the
 * question they answered when they joined.
 */
const UserModeSelect = ({
    value,
    onChange,
    variant = "cards",
    disabled = false,
}: UserModeSelectProps) => {
    const isRows = variant === "rows";

    return (
        <div className={isRows ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>
            {USER_MODES.map((option) => {
                const Icon = MODE_ICONS[option.value];
                const selected = value === option.value;

                return (
                    <motion.button
                        key={option.value}
                        type="button"
                        disabled={disabled}
                        whileTap={disabled ? undefined : { scale: 0.98 }}
                        onClick={() => {
                            if (disabled || selected) return;
                            hapticLight();
                            onChange(option.value);
                        }}
                        aria-pressed={selected}
                        className={`group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-50 ${selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/40"
                            }`}
                    >
                        <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                                }`}
                        >
                            <Icon className="h-5 w-5" />
                        </span>

                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                                <span className="font-display text-sm font-semibold text-foreground">
                                    {option.label}
                                </span>
                                {selected && (
                                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                                )}
                            </span>
                            <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {option.tagline}
                            </span>
                            {!isRows && (
                                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                                    {option.description}
                                </span>
                            )}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
};

export default UserModeSelect;
