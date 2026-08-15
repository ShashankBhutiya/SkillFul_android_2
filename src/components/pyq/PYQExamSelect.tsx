import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Award, ShieldAlert } from "lucide-react";
import { hapticSuccess } from "@/hooks/useHaptics";

interface PYQExamSelectProps {
  onSelect: (exam: "jee_main" | "jee_advanced" | "neet") => void;
}

const EXAM_CARDS = [
  {
    id: "jee_main" as const,
    name: "JEE Main",
    tagline: "Single Correct & Numerical Practice",
    gradient: "from-cyan-500 via-blue-500 to-indigo-600",
    shadow: "shadow-cyan-500/20",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    icon: BookOpen,
    desc: "Simulate JEE Main standard questions with precise +4/-1 and numerical type marking."
  },
  {
    id: "jee_advanced" as const,
    name: "JEE Advanced",
    tagline: "Multiple Correct & Partial Marking",
    gradient: "from-violet-600 via-purple-600 to-fuchsia-700",
    shadow: "shadow-purple-500/20",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    icon: Award,
    desc: "Tackle multi-select questions with complex partial marking schemes (+4/-2)."
  },
  {
    id: "neet" as const,
    name: "NEET",
    tagline: "Assertion-Reasoning & Concept Practice",
    gradient: "from-emerald-400 via-teal-500 to-green-600",
    shadow: "shadow-emerald-500/20",
    subjects: ["Physics", "Chemistry", "Biology"],
    icon: ShieldAlert,
    desc: "Speed practice with single correct questions and assertion-reasoning (+4/-1)."
  }
];

export default function PYQExamSelect({ onSelect }: PYQExamSelectProps) {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 max-w-4xl mx-auto w-full">
      {/* Title */}
      <div className="text-center mb-4">
        <motion.h2 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          Select Your Target Exam
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xs text-muted-foreground mt-2 max-w-md mx-auto"
        >
          Practice authentic previous year questions matching exact paper formats, marking schemes, and question types.
        </motion.p>
      </div>

      {/* Grid of exam cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {EXAM_CARDS.map((exam, idx) => {
          const Icon = exam.icon;
          return (
            <motion.button
              key={exam.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.08, type: "spring", stiffness: 100 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                hapticSuccess();
                onSelect(exam.id);
              }}
              className={`flex flex-col text-left rounded-3xl border border-border/50 bg-card overflow-hidden shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-300 relative group min-h-[280px]`}
            >
              {/* Header colored banner */}
              <div className={`h-24 w-full bg-gradient-to-br ${exam.gradient} p-4 flex items-center justify-between relative`}>
                {/* Backlight glow */}
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  {exam.subjects.length} Subjects
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {exam.name}
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-[11px] font-bold text-primary/80 uppercase tracking-wider">{exam.tagline}</p>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed font-body mt-1">
                    {exam.desc}
                  </p>
                </div>

                {/* Subject list pills */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                  {exam.subjects.map((sub) => (
                    <span 
                      key={sub} 
                      className="text-[10px] font-semibold bg-muted/65 text-muted-foreground px-2 py-0.5 rounded-md"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
