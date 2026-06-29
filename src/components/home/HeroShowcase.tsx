import { motion } from "framer-motion";
import { Briefcase, X, Check } from "lucide-react";

const HeroShowcase = () => {
  return (
    <div
      className="relative mx-auto w-full max-w-[380px] lg:mx-0 lg:max-w-[420px]"
      style={{ perspective: 1200 }}
    >
      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, rotateX: 15, rotateY: -18, rotateZ: 5, scale: 0.92 }}
        animate={{ opacity: 1, rotateX: 8, rotateY: -10, rotateZ: 2, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 80, damping: 22 }}
        className="hero-float relative z-30 w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl"
      >
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-3 w-3 text-primary" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
              Leadership
            </span>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            3 / 41
          </span>
        </div>

        {/* Scenario */}
        <div className="flex min-h-[180px] flex-col items-center justify-center px-7 py-10 text-center">
          <p className="font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
            Great leaders never admit when they're wrong.
          </p>
        </div>

        {/* Swipe actions */}
        <div className="flex items-center justify-between gap-3 border-t border-border/40 px-5 py-4">
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/8 py-3 text-sm font-bold text-destructive">
            <X className="h-4 w-4" />
            False
          </div>
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-success/8 py-3 text-sm font-bold text-success">
            True
            <Check className="h-4 w-4" />
          </div>
        </div>
      </motion.div>

      {/* Stack layer 1 */}
      <motion.div
        initial={{ opacity: 0, rotateX: 15, rotateY: -18, scale: 0.92 }}
        animate={{ opacity: 0.5, rotateX: 12, rotateY: -8, rotateZ: -1, scale: 0.95, y: 32, x: -10 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 80, damping: 22 }}
        className="absolute inset-0 -z-10 rounded-2xl border border-border/30 bg-card shadow-lg"
        aria-hidden
      />

      {/* Stack layer 2 */}
      <motion.div
        initial={{ opacity: 0, rotateX: 15, rotateY: -18, scale: 0.92 }}
        animate={{ opacity: 0.25, rotateX: 16, rotateY: -5, rotateZ: -3, scale: 0.9, y: 64, x: -20 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 80, damping: 22 }}
        className="absolute inset-0 -z-20 rounded-2xl border border-border/20 bg-muted shadow-md"
        aria-hidden
      />

      {/* Correct toast */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1 }}
        className="absolute -bottom-3 right-2 z-40 flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2.5 shadow-lg sm:right-6"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-xs font-bold text-success">Correct!</p>
          <p className="text-[10px] text-muted-foreground">Vulnerability builds trust</p>
        </div>
      </motion.div>
    </div>
  );
};

export default HeroShowcase;
