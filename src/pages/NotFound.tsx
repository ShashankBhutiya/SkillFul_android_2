import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SeoHead } from "@/components/SeoHead";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { ArrowLeft, Home, X, Check, HelpCircle } from "lucide-react";
import { hapticLight, hapticSuccess } from "@/hooks/useHaptics";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [speechText, setSpeechText] = useState(
    "Hoo... where are we? This page isn't in my guidebook! Swipe the card to navigate."
  );

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const [hasSwiped, setHasSwiped] = useState(false);

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

  // Monitor dragging to update owl speech in real-time
  useEffect(() => {
    return x.onChange((latest) => {
      if (latest < -30) {
        setSpeechText("Going back? Smart move to play it safe!");
      } else if (latest > 30) {
        setSpeechText("To the home page! Let's practice some real skills.");
      } else {
        setSpeechText("Hoo... where are we? This page isn't in my guidebook! Swipe the card to navigate.");
      }
    });
  }, [x]);

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "left") {
      setSpeechText("Navigating back...");
      hapticSuccess();
      setTimeout(() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/");
        }
      }, 300);
    } else {
      setSpeechText("Heading home...");
      hapticSuccess();
      setTimeout(() => {
        navigate("/");
      }, 300);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (hasSwiped) return;
    const threshold = 80;
    if (info.offset.x > threshold) {
      setHasSwiped(true);
      hapticLight();
      animate(x, 400, { duration: 0.3 });
      setTimeout(() => handleSwipe("right"), 200);
    } else if (info.offset.x < -threshold) {
      setHasSwiped(true);
      hapticLight();
      animate(x, -400, { duration: 0.3 });
      setTimeout(() => handleSwipe("left"), 200);
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
    }
  };

  const triggerSwipeLeft = () => {
    if (hasSwiped) return;
    setHasSwiped(true);
    hapticLight();
    animate(x, -400, { duration: 0.3 });
    setTimeout(() => handleSwipe("left"), 200);
  };

  const triggerSwipeRight = () => {
    if (hasSwiped) return;
    setHasSwiped(true);
    hapticLight();
    animate(x, 400, { duration: 0.3 });
    setTimeout(() => handleSwipe("right"), 200);
  };

  // Handle arrow key swipes on NotFound page
  useEffect(() => {
    if (hasSwiped) return;

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
        triggerSwipeLeft();
      } else if (event.key === "ArrowRight") {
        triggerSwipeRight();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSwiped, triggerSwipeLeft, triggerSwipeRight]);

  return (
    <MainLayout>
      <SeoHead
        title="Page Not Found"
        description="The page you requested could not be found."
        path={location.pathname}
        noindex
      />
      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12 overflow-hidden">
        {/* Dot grid background */}
        <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] pointer-events-none" aria-hidden />

        {/* Confused Owl Mascot & Speech Bubble */}
        <div className="flex flex-col items-center max-w-sm w-full mb-8 relative z-20">
          {/* Speech Bubble */}
          <div className="relative bg-card/95 backdrop-blur-sm text-foreground px-4 py-3 rounded-2xl rounded-bl-sm shadow-lg border border-border max-w-[280px] text-center mb-6">
            <p className="font-display font-semibold text-xs sm:text-sm leading-snug">
              {speechText}
            </p>
            {/* Speech bubble pointer */}
            <div className="absolute bottom-[-6px] left-[calc(50%-6px)] w-3 h-3 bg-card border-r border-b border-border rotate-45" />
          </div>

          {/* Animated Mascot */}
          <motion.div
            animate={{ 
              y: [0, -6, 0],
              rotate: [-3, 3, -3]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 3,
              ease: "easeInOut"
            }}
            className="w-20 h-20 shrink-0 relative"
          >
            {/* Body */}
            <div className="absolute inset-0 bg-primary rounded-[2.5rem] rounded-bl-xl shadow-lg border-2 border-primary-foreground/20 overflow-hidden">
              {/* Face Area */}
              <div className="absolute top-3 left-2 right-2 bottom-3 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center gap-2">
                {/* Spinning Confused Eyes */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="w-5 h-5 rounded-full border border-dashed border-primary-foreground/60 flex items-center justify-center text-[10px] font-bold text-primary-foreground select-none"
                >
                  ?
                </motion.div>
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="w-5 h-5 rounded-full border border-dashed border-primary-foreground/60 flex items-center justify-center text-[10px] font-bold text-primary-foreground select-none"
                >
                  ?
                </motion.div>
              </div>
              {/* Beak */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1 w-3 h-3 bg-orange-400 rotate-45 rounded-sm" />
            </div>
            {/* Ears */}
            <div className="absolute -top-2 left-2 w-4 h-6 bg-primary rounded-t-full -rotate-12 -z-10" />
            <div className="absolute -top-2 right-2 w-4 h-6 bg-primary rounded-t-full rotate-12 -z-10" />
          </motion.div>
        </div>

        {/* 404 Heading */}
        <div className="text-center mb-6 relative z-20">
          <h1 className="font-display text-5xl sm:text-6xl font-black text-gradient leading-none">404</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-2 uppercase tracking-widest">
            Page Not Found
          </p>
        </div>

        {/* Interactive Swipe Card */}
        <div className="relative w-full max-w-[340px] aspect-[4/5] sm:aspect-[3/4] mb-8 z-10">
          <motion.div
            className="absolute inset-0 rounded-[1.75rem] shadow-2xl cursor-grab active:cursor-grabbing touch-none select-none overflow-hidden bg-card/95 p-[2px] border border-border/50"
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDragEnd={handleDragEnd}
          >
            <div className="relative w-full h-full flex flex-col overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-primary/10 via-card to-accent/10">
              {/* Overlays */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent to-green-500/20 mix-blend-overlay pointer-events-none"
                style={{ opacity: greenOpacity }}
              />
              <motion.div
                className="absolute inset-0 bg-gradient-to-l from-transparent to-red-500/20 mix-blend-overlay pointer-events-none"
                style={{ opacity: redOpacity }}
              />

              {/* Card Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-border/40 px-5 py-4">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 shadow-sm">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Decision Point
                </span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse"></span>
              </div>

              {/* Card Content */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-6 text-center">
                <p className="font-display text-lg sm:text-xl font-bold leading-snug text-foreground">
                  Statement: A 404 error is just a test of your pathfinding judgment.
                </p>
                <div className="mt-6 space-y-2 text-xs text-left w-full max-w-[240px] bg-muted/50 p-3.5 rounded-xl border border-border">
                  <p className="flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-destructive/20 text-[10px] font-bold text-destructive">F</span>
                    <span className="font-medium text-foreground">Swipe Left: Go Back (False)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-success/20 text-[10px] font-bold text-success">T</span>
                    <span className="font-medium text-foreground">Swipe Right: Go Home (True)</span>
                  </p>
                </div>
                <p className="mt-6 text-[11px] text-muted-foreground/80 font-medium tracking-wide uppercase swipe-hint">
                  Swipe the card to choose
                </p>
              </div>

              {/* Card Footer Actions */}
              <div className="relative z-10 flex items-center justify-between gap-4 border-t border-border/40 px-5 py-4">
                <motion.div
                  style={{ scale: falseButtonScale, backgroundColor: falseButtonBg }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/30 py-2.5 text-xs font-bold text-destructive shadow-sm backdrop-blur-sm font-display"
                >
                  <X className="h-3.5 w-3.5 stroke-[3]" />
                  False
                </motion.div>
                <motion.div
                  style={{ scale: trueButtonScale, backgroundColor: trueButtonBg }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-success/30 py-2.5 text-xs font-bold text-success shadow-sm backdrop-blur-sm font-display"
                >
                  True
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* External Buttons */}
        <div className="flex items-center gap-4 z-20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={triggerSwipeLeft}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors shadow-sm font-display"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={triggerSwipeRight}
            className="flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-xs sm:text-sm font-bold text-background shadow-md hover:opacity-90 transition-opacity font-display"
          >
            <Home className="h-4 w-4" />
            Go Home
          </motion.button>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;
