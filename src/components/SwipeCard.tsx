import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { Question, Category } from "@/data/questions";
import { hapticLight } from "@/hooks/useHaptics";
import { X, Check } from "lucide-react";

interface SwipeCardProps {
  question: Question;
  category: Category;
  onSwipe: (direction: "left" | "right") => void;
  isTop: boolean;
}

const SwipeCard = ({ question, category, onSwipe, isTop }: SwipeCardProps) => {
  const [hasSwiped, setHasSwiped] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Reset swipe state when question changes
  useEffect(() => {
    setHasSwiped(false);
  }, [question.id]);

  // Handle arrow key swipes
  useEffect(() => {
    if (!isTop || hasSwiped) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in inputs or editable elements
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.hasAttribute("contenteditable")
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setHasSwiped(true);
        hapticLight();
        animate(x, -400, { duration: 0.3 });
        setTimeout(() => onSwipe("left"), 200);
      } else if (event.key === "ArrowRight") {
        setHasSwiped(true);
        hapticLight();
        animate(x, 400, { duration: 0.3 });
        setTimeout(() => onSwipe("right"), 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTop, hasSwiped, x, onSwipe]);

  // Subtle background overlays for feedback
  const greenOpacity = useTransform(x, [0, 80, 200], [0, 0.15, 0.4]);
  const redOpacity = useTransform(x, [-200, -80, 0], [0.4, 0.15, 0]);

  const falseButtonScale = useTransform(x, [-100, 0], [1.05, 1]);
  const trueButtonScale = useTransform(x, [0, 100], [1, 1.05]);

  const falseButtonBg = useTransform(
    x,
    [-100, 0],
    ["rgba(239, 68, 68, 0.2)", "rgba(239, 68, 68, 0.1)"]
  );
  
  const trueButtonBg = useTransform(
    x,
    [0, 100],
    ["rgba(34, 197, 94, 0.1)", "rgba(34, 197, 94, 0.2)"]
  );

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (hasSwiped) return;
    const threshold = 80;
    if (info.offset.x > threshold) {
      setHasSwiped(true);
      hapticLight();
      animate(x, 400, { duration: 0.3 });
      setTimeout(() => onSwipe("right"), 200);
    } else if (info.offset.x < -threshold) {
      setHasSwiped(true);
      hapticLight();
      animate(x, -400, { duration: 0.3 });
      setTimeout(() => onSwipe("left"), 200);
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
    }
  };

  const handleFalseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasSwiped) return;
    setHasSwiped(true);
    hapticLight();
    animate(x, -400, { duration: 0.3 });
    setTimeout(() => onSwipe("left"), 200);
  };

  const handleTrueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasSwiped) return;
    setHasSwiped(true);
    hapticLight();
    animate(x, 400, { duration: 0.3 });
    setTimeout(() => onSwipe("right"), 200);
  };

  if (!isTop) {
    return (
      <motion.div
        className="absolute inset-0 rounded-[1.75rem] bg-card/95 p-1 shadow-lg border border-border/50"
        style={{ scale: 0.95, y: 15 }}
      >
        <div className="absolute inset-0 rounded-[1.6rem] bg-gradient-to-br from-primary/10 via-card to-accent/5 opacity-50" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-[1.75rem] shadow-2xl cursor-grab active:cursor-grabbing touch-none select-none overflow-hidden bg-card/95 p-[2px] border border-border/50"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
    >
      <div className="relative w-full h-full flex flex-col overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-primary/10 via-card to-accent/10">
        {/* Dynamic Background Gradients */}
        <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-[0.05]`} />
        
        {/* Swipe Feedback Overlays */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent to-green-500/20 mix-blend-overlay pointer-events-none"
          style={{ opacity: greenOpacity }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-l from-transparent to-red-500/20 mix-blend-overlay pointer-events-none"
          style={{ opacity: redOpacity }}
        />

        {/* Card header */}
        <div className="relative z-10 flex items-center justify-between border-b border-border/40 px-5 py-4">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 shadow-sm">
            {category.icon ? (
              <img src={category.icon} alt="" className="w-3.5 h-3.5 rounded-[3px] object-cover" />
            ) : (
              <span>{category.emoji}</span>
            )}
            {category.name}
          </span>
          {/* Question count indicator is optional since it's global, but we can put a small icon */}
          <span className="flex h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse"></span>
        </div>

        {/* Scenario Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <p className="font-display text-xl sm:text-2xl font-bold leading-snug text-foreground drop-shadow-sm">
            {question.statement}
          </p>
          <p className="mt-6 text-sm text-muted-foreground/80 font-medium">Swipe your answer</p>
        </div>

        {/* Swipe actions (Bottom buttons) */}
        <div className="relative z-10 flex items-center justify-between gap-4 border-t border-border/40 px-5 py-4">
          <motion.button
            type="button"
            onClick={handleFalseClick}
            style={{ scale: falseButtonScale, backgroundColor: falseButtonBg }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-bold text-destructive shadow-sm backdrop-blur-sm cursor-pointer hover:brightness-110 active:brightness-95 transition-all select-none"
          >
            <X className="h-4 w-4 stroke-[3]" />
            False
          </motion.button>
          <motion.button
            type="button"
            onClick={handleTrueClick}
            style={{ scale: trueButtonScale, backgroundColor: trueButtonBg }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-success/30 py-3 text-sm font-bold text-success shadow-sm backdrop-blur-sm cursor-pointer hover:brightness-110 active:brightness-95 transition-all select-none"
          >
            True
            <Check className="h-4 w-4 stroke-[3]" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
