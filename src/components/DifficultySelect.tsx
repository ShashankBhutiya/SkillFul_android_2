import { motion } from "framer-motion";
import { categories } from "@/data/questions";
import { useAuth } from "@/contexts/AuthContext";
import { getPracticedIds } from "@/services/progressService";
import { MainLayout } from "@/components/layout/MainLayout";
import { BookOpen, Zap, ArrowLeft, ChevronRight } from "lucide-react";
import { hapticLight } from "@/hooks/useHaptics";

interface DifficultySelectProps {
    categoryId: string;
    onSelect: (difficulty: "easy" | "intermediate") => void;
    onBack: () => void;
}

const DifficultySelect = ({ categoryId, onSelect, onBack }: DifficultySelectProps) => {
    const { user } = useAuth();
    const category = categories.find((c) => c.id === categoryId)!;

    // Show practiced counts for all users (including guests)
    const practicedIds = new Set(getPracticedIds(categoryId, user.id));
    const easyPracticed = category.questions.slice(0, 50).filter(q => practicedIds.has(q.id)).length;
    const intPracticed = category.questions.slice(50).filter(q => practicedIds.has(q.id)).length;
    const easyTotal = Math.min(category.questions.length, 50);
    const intTotal = Math.max(0, category.questions.length - 50);

    return (
        <MainLayout>
            <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-12">
                {/* Back button */}
                <div className="mb-8 w-full">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="flex items-center gap-2 rounded-full bg-muted/80 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </motion.button>
                </div>

                {/* Category header */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="mb-10 text-center"
                >
                    <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                        {category.name}
                    </h1>
                    <p className="mt-2 text-base text-muted-foreground">
                        Choose your difficulty level
                    </p>
                </motion.div>

                {/* Difficulty cards */}
                <div className="w-full space-y-4">
                    {/* Easy */}
                    <motion.button
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { hapticLight(); onSelect("easy"); }}
                        className="group w-full rounded-2xl border border-border/50 bg-card p-6 text-left shadow-sm transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-display text-xl font-bold text-foreground">Easy</h3>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-emerald-500" />
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Build your foundation with core concepts and straightforward scenarios.
                                </p>
                                <div className="mt-3 flex items-center gap-3">
                                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        {easyTotal} questions
                                    </span>
                                    {easyPracticed > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            {easyPracticed} practiced
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.button>

                    {/* Intermediate */}
                    {(() => {
                        const hasIntermediate = category.questions.length > 50;
                        return (
                            <motion.button
                                initial={{ x: 30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                whileHover={hasIntermediate ? { scale: 1.02, y: -2 } : {}}
                                whileTap={hasIntermediate ? { scale: 0.98 } : {}}
                                onClick={() => { if (hasIntermediate) { hapticLight(); onSelect("intermediate"); } }}
                                disabled={!hasIntermediate}
                                className={`group w-full rounded-2xl border p-6 text-left shadow-sm transition-all duration-300 ${hasIntermediate
                                        ? "border-border/50 bg-card hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 cursor-pointer"
                                        : "border-border/30 bg-muted/30 opacity-50 cursor-not-allowed"
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${hasIntermediate ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"}`}>
                                        <Zap className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-display text-xl font-bold text-foreground">Intermediate</h3>
                                            {hasIntermediate && (
                                                <ChevronRight className="h-5 w-5 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-orange-500" />
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {hasIntermediate
                                                ? "Deeper questions that challenge your understanding and push you to level up."
                                                : "Coming soon -- more questions are being added."}
                                        </p>
                                        {hasIntermediate && (
                                            <div className="mt-3 flex items-center gap-3">
                                                <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                                    {intTotal} questions
                                                </span>
                                                {intPracticed > 0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {intPracticed} practiced
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })()}
                </div>
            </div>
        </MainLayout>
    );
};

export default DifficultySelect;
