import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trophy, Sparkles } from "lucide-react";
import { Category } from "@/data/questions";
import { CategoryIcon } from "@/lib/categoryIcons";

interface MilestoneCelebrationProps {
  category: Category;
  milestoneNumber: number;
  message: string;
  onDismiss: () => void;
}

const CONFETTI_COLORS = ["#ff0055", "#00ffcc", "#ffcc00", "#ff00ff", "#00ff00", "#0088ff", "#ff4400"];

export const MilestoneCelebration = ({
  category,
  milestoneNumber,
  message,
  onDismiss,
}: MilestoneCelebrationProps) => {
  // Generate random confetti configuration
  const particles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage from left
      y: -10 - Math.random() * 20, // starts above screen
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 10 + 6, // 6px to 16px
      drift: Math.random() * 30 - 15, // horizontal drift (vw)
      duration: Math.random() * 2.5 + 2, // fall speed
      delay: Math.random() * 0.8,
      rotate: Math.random() * 360,
    }));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md overflow-hidden"
    >
      {/* Rain of Confetti */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute pointer-events-none rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 1.5 : 1), // rectangles + squares
            backgroundColor: p.color,
            zIndex: 10,
          }}
          initial={{ y: "-10vh", rotate: p.rotate, opacity: 1 }}
          animate={{
            y: "110vh",
            x: `${p.drift}vw`,
            rotate: p.rotate + 720,
            opacity: [1, 1, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: Math.random() * 1.5,
          }}
        />
      ))}

      {/* Main Celebration Card */}
      <motion.div
        initial={{ y: 50, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 50, scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-full max-w-sm bg-card/90 border border-primary/20 rounded-3xl p-6 shadow-2xl backdrop-blur-xl z-20 overflow-hidden flex flex-col items-center text-center"
      >
        {/* Glow behind trophy */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-gradient-to-tr ${category.gradient} opacity-20 blur-3xl -z-10`} />

        {/* Shiny Trophy Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: [0, 1.2, 1], rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", damping: 12 }}
          className="relative w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4"
        >
          <Trophy className="w-10 h-10 text-yellow-500 fill-yellow-500/10 animate-bounce" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </motion.div>
        </motion.div>

        {/* Category name & badge */}
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary mb-1 inline-flex items-center gap-1.5">
          <CategoryIcon categoryId={category.id} className="w-3.5 h-3.5 shrink-0" />
          {category.name}
        </span>

        {/* Milestone Titles */}
        <h2 className="font-display font-extrabold text-2xl text-foreground mt-2">
          Milestone Cleared!
        </h2>
        <p className="text-sm text-muted-foreground font-body mt-1">
          You've successfully answered <span className="font-bold text-foreground">{milestoneNumber}</span> scenarios!
        </p>

        {/* Milestone Stats Checkpoint Indicator */}
        <div className="w-full bg-muted/60 rounded-2xl p-4 my-5 border border-border/40 text-left">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-2">
            <span>CHECKPOINT REACHED</span>
            <span className="text-success flex items-center gap-1">
              Progress Saved <Check className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20 text-success text-[10px] font-bold">✓</span>
            <span>Completed 5 / 5 Practice Scenarios</span>
          </div>
        </div>

        {/* Mascot section */}
        <div className="flex items-end gap-3 w-full mb-6 text-left">
          {/* Animated Mascot */}
          <motion.div
            animate={{ 
              y: [0, -6, 0],
              rotate: [-1.5, 1.5, -1.5]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2.2,
              ease: "easeInOut"
            }}
            className="w-14 h-14 shrink-0 relative"
          >
            <div className="absolute inset-0 bg-primary rounded-[1.8rem] rounded-bl-lg shadow-md border border-primary-foreground/10 overflow-hidden">
              <div className="absolute top-2.5 left-1.5 right-1.5 bottom-2.5 bg-white/20 backdrop-blur-md rounded-[1.2rem] flex items-center justify-center gap-1.5">
                <div className="w-2 h-2.5 bg-primary-foreground rounded-full" />
                <div className="w-2 h-2.5 bg-primary-foreground rounded-full" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-0.5 w-2 h-2 bg-orange-400 rotate-45 rounded-sm" />
            </div>
            <div className="absolute -top-1 left-1 w-3 h-4 bg-primary rounded-t-full -rotate-12 -z-10" />
            <div className="absolute -top-1 right-1 w-3 h-4 bg-primary rounded-t-full rotate-12 -z-10" />
          </motion.div>

          {/* Speech Bubble */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 bg-muted/40 p-3 rounded-2xl rounded-bl-sm border border-border/40"
          >
            <p className="font-display font-bold text-sm text-foreground italic leading-tight">
              "{message}"
            </p>
          </motion.div>
        </div>

        {/* Action button */}
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDismiss}
          className={`w-full py-4 rounded-2xl bg-gradient-to-r ${category.gradient} text-white font-display font-bold text-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer`}
        >
          Keep Swiping <Check className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
