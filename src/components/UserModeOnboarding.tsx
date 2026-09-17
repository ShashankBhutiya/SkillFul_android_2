import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import UserModeSelect from "@/components/UserModeSelect";
import { useUserMode } from "@/hooks/useUserMode";
import { hapticSuccess } from "@/hooks/useHaptics";
import type { UserMode } from "@/config/userMode";

interface UserModeOnboardingProps {
    onDone?: (mode: UserMode) => void;
}

/**
 * First-run mode picker.
 *
 * Shown once, on the first open after install, before the catalog is ever
 * rendered — the two modes have almost no overlap, so showing the wrong one
 * first is worse than a single question. The answer is reused to pre-fill the
 * signup step, so a user never answers it twice.
 */
const UserModeOnboarding = ({ onDone }: UserModeOnboardingProps) => {
    const { setMode } = useUserMode();
    const [choice, setChoice] = useState<UserMode | null>(null);

    const handleContinue = () => {
        if (!choice) return;
        hapticSuccess();
        setMode(choice);
        onDone?.(choice);
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg"
            >
                <div className="mb-9 border-b border-border pb-7 text-left">
                    <div className="mb-8 flex items-center gap-2.5">
                        <img src="/favicon.png" alt="" className="h-8 w-8 rounded-md" />
                        <span className="font-display text-sm font-semibold tracking-tight">Skillful</span>
                    </div>
                    <p className="section-label">Personalize your practice</p>
                    <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                        What are you preparing for?
                    </h1>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                        Choose the path that fits your life right now. You can change this later in settings.
                    </p>
                </div>

                <UserModeSelect value={choice} onChange={setChoice} />

                <motion.button
                    type="button"
                    whileTap={choice ? { scale: 0.98 } : undefined}
                    onClick={handleContinue}
                    disabled={!choice}
                    className="mt-7 flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                </motion.button>
            </motion.div>
        </main>
    );
};

export default UserModeOnboarding;
