import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight, Zap, RefreshCw } from "lucide-react";
import { fetchSubjectProgress } from "@/services/pyqService";
import { hapticLight, hapticSuccess } from "@/hooks/useHaptics";

interface PYQSubjectSelectProps {
  exam: "jee_main" | "jee_advanced" | "neet";
  userId: string;
  onSelect: (subject: "physics" | "chemistry" | "mathematics" | "biology") => void;
  onBack: () => void;
}

interface SubjectCardConfig {
  id: "physics" | "chemistry" | "mathematics" | "biology";
  name: string;
  emoji: string;
  gradient: string;
}

const SUBJECT_CONFIGS: Record<string, SubjectCardConfig[]> = {
  jee_main: [
    { id: "physics", name: "Physics", emoji: "⚡", gradient: "from-blue-400 to-indigo-600" },
    { id: "chemistry", name: "Chemistry", emoji: "🧪", gradient: "from-amber-400 to-orange-500" },
    { id: "mathematics", name: "Mathematics", emoji: "📐", gradient: "from-fuchsia-500 to-pink-600" }
  ],
  jee_advanced: [
    { id: "physics", name: "Physics", emoji: "⚛️", gradient: "from-blue-500 to-indigo-700" },
    { id: "chemistry", name: "Chemistry", emoji: "🧪", gradient: "from-amber-500 to-orange-600" },
    { id: "mathematics", name: "Mathematics", emoji: "♾️", gradient: "from-fuchsia-600 to-pink-700" }
  ],
  neet: [
    { id: "physics", name: "Physics", emoji: "⚡", gradient: "from-blue-400 to-indigo-600" },
    { id: "chemistry", name: "Chemistry", emoji: "🧪", gradient: "from-amber-400 to-orange-500" },
    { id: "biology", name: "Biology", emoji: "🌿", gradient: "from-emerald-400 to-teal-600" }
  ]
};

export default function PYQSubjectSelect({ exam, userId, onSelect, onBack }: PYQSubjectSelectProps) {
  const [stats, setStats] = useState<Record<string, { attempted: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  const examLabel = exam === "jee_main" ? "JEE Main" : exam === "jee_advanced" ? "JEE Advanced" : "NEET";
  const subjects = SUBJECT_CONFIGS[exam] || [];

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetchSubjectProgress(userId, exam);
        setStats(res);
      } catch (err) {
        console.warn("Failed to load progress stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [userId, exam]);

  return (
    <div className="flex flex-col gap-6 px-4 py-8 max-w-xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            hapticLight();
            onBack();
          }}
          className="p-2.5 rounded-full bg-muted/80 backdrop-blur-sm hover:bg-muted transition-colors"
          title="Back to exam select"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">{examLabel} Practice</h2>
          <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Choose a subject</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading subjects...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {subjects.map((sub, idx) => {
            const subjectStats = stats[sub.id] || { attempted: 0, total: 0 };
            const progressPct = subjectStats.total > 0
              ? Math.round((subjectStats.attempted / subjectStats.total) * 100)
              : 0;

            return (
              <motion.button
                key={sub.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  hapticSuccess();
                  onSelect(sub.id);
                }}
                className="group flex items-center justify-between p-4.5 rounded-2xl border border-border/50 bg-card hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-300 text-left relative overflow-hidden"
              >
                {/* Visual Left accent emoji */}
                <div className="flex items-center gap-4.5 min-w-0">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${sub.gradient} text-2xl shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                    {sub.emoji}
                  </div>
                  <div className="min-w-0 pr-2">
                    <h3 className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {sub.name}
                    </h3>
                    
                    {/* Progress details */}
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground font-semibold">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      <span>
                        {subjectStats.attempted} / {subjectStats.total} Solved
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Arrow/Percentage column */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">
                      {progressPct}%
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
