import { FormEvent, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Check, Loader2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
    JOIN_ERROR_TEXT,
    fetchMyInstitution,
    joinInstitution,
    type MyInstitution,
} from "@/services/institutionService";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Lets a student attach themselves to their college with the code their
 * placement cell hands out.
 *
 * Roll number and branch are asked for here because the placement cell's
 * roster shows and filters on them; a code alone leaves those blank and the
 * student is unidentifiable to their own TPO.
 */
export default function InstitutionCard() {
    const { user } = useAuth();
    const [membership, setMembership] = useState<MyInstitution | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    const [code, setCode] = useState("");
    const [rollNumber, setRollNumber] = useState("");
    const [branch, setBranch] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const refresh = useCallback(async () => {
        const found = await fetchMyInstitution();
        setMembership(found);
        setLoading(false);
        return found;
    }, []);

    useEffect(() => {
        if (user.isGuest) {
            setLoading(false);
            return;
        }
        void refresh();
    }, [user.isGuest, user.id, refresh]);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);

        const result = await joinInstitution(code, {
            rollNumber: rollNumber.trim() || undefined,
            branch: branch.trim() || undefined,
        });

        setSubmitting(false);

        if (!result.ok) {
            toast({
                title: "Couldn't join",
                description: JOIN_ERROR_TEXT[result.error ?? "unavailable"],
                variant: "destructive",
            });
            return;
        }

        toast({
            title: `Joined ${result.institutionName}`,
            description:
                "Your placement cell can now see your practice progress on their dashboard.",
        });

        setCode("");
        setEditing(false);
        await refresh();
    }

    // Guests have no auth uid, so there is nothing to attach a college to.
    if (user.isGuest || loading) return null;

    const showForm = editing || !membership;

    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="mb-8"
        >
            <h2 className="section-label mb-2.5 px-1">Your college</h2>

            <div className="surface overflow-hidden p-4">
                {membership && !editing && (
                    <div className="flex items-start gap-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Building2 className="h-[18px] w-[18px]" />
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium text-foreground">
                                {membership.institutionName}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {membership.role === "tpo"
                                    ? "Placement officer"
                                    : [membership.rollNumber, membership.branch]
                                          .filter(Boolean)
                                          .join(" · ") || "Roll number not added"}
                            </p>
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                                <Check className="h-3.5 w-3.5" />
                                Your placement cell can see your progress
                            </p>
                        </div>

                        {membership.role !== "tpo" && (
                            <button
                                type="button"
                                onClick={() => {
                                    setRollNumber(membership.rollNumber ?? "");
                                    setBranch(membership.branch ?? "");
                                    setCode(membership.code);
                                    setEditing(true);
                                }}
                                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <Pencil className="h-3 w-3" />
                                Edit
                            </button>
                        )}
                    </div>
                )}

                {showForm && (
                    <form onSubmit={onSubmit}>
                        {!membership && (
                            <p className="mb-3.5 text-sm text-muted-foreground">
                                Got a code from your placement cell? Enter it so they can track
                                your placement readiness.
                            </p>
                        )}

                        <label
                            htmlFor="join-code"
                            className="block text-xs font-medium text-muted-foreground"
                        >
                            College code
                        </label>
                        <input
                            id="join-code"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. YCE2026"
                            autoCapitalize="characters"
                            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm uppercase tracking-wide outline-none focus:ring-2 focus:ring-ring"
                        />

                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                                <label
                                    htmlFor="join-roll"
                                    className="block text-xs font-medium text-muted-foreground"
                                >
                                    Roll number
                                </label>
                                <input
                                    id="join-roll"
                                    value={rollNumber}
                                    onChange={(e) => setRollNumber(e.target.value)}
                                    placeholder="21CS059"
                                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="join-branch"
                                    className="block text-xs font-medium text-muted-foreground"
                                >
                                    Branch
                                </label>
                                <input
                                    id="join-branch"
                                    value={branch}
                                    onChange={(e) => setBranch(e.target.value)}
                                    placeholder="CSE"
                                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                            >
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {membership ? "Save" : "Join college"}
                            </button>

                            {membership && (
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="h-10 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </motion.section>
    );
}
