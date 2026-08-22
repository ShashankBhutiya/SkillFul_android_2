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
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md"
            >
                <div className="mb-8 text-center">
                    <img
                        src="/favicon.png"
                        alt=""
                        className="mx-auto mb-5 h-12 w-12 rounded-xl"
                    />
                    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        Welcome to Skillful
                    </h1>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        First, tell us where you are right now. We'll show you the
                        scenarios built for that — you can change it any time in Settings.
                    </p>
                </div>

                <UserModeSelect value={choice} onChange={setChoice} />

                <motion.button
                    type="button"
                    whileTap={choice ? { scale: 0.98 } : undefined}
                    onClick={handleContinue}
                    disabled={!choice}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-40"
                >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                </motion.button>
            </motion.div>
        </main>
    );
};

export default UserModeOnboarding;
