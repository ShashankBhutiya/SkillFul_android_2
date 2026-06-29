import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Smartphone, Zap, Share, PlusSquare, ArrowUpRight } from "lucide-react";
import { usePwaInstallState } from "@/hooks/usePwaInstallState";
import { triggerPwaInstall } from "@/services/pwaInstallService";

export const PwaInstallPrompt = () => {
  const { isInstallable, isIOSInstallable } = usePwaInstallState();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || (!isInstallable && !isIOSInstallable)) return;

    // Check if dismissed in this browser session
    const isDismissed = localStorage.getItem("skillful_pwa_prompt_dismissed") === "true";
    if (isDismissed) return;

    // Show after 10 seconds of active browsing (the appropriate, non-intrusive time!)
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [isInstallable, isIOSInstallable]);

  const handleInstall = async () => {
    if (isIOSInstallable) {
      setShowIosModal(true);
      setShowPrompt(false);
      return;
    }

    const installed = await triggerPwaInstall();
    if (installed) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("skillful_pwa_prompt_dismissed", "true");
    setShowPrompt(false);
  };

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 220 }}
            className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-[99] bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-primary/20 p-5 pr-11 text-foreground"
          >
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              aria-label="Dismiss install banner"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Prompt Content */}
            <div className="flex gap-4 items-start">
              {/* Styled Icon */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15 shadow-sm">
                <Smartphone className="h-6 w-6 stroke-[1.8] animate-pulse" />
              </div>

              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  Install Skillful App 🦉
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold text-accent">
                    {isIOSInstallable ? "Safari WebApp" : "PWA Ready"}
                  </span>
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground font-body">
                  Add Skillful to your home screen! Run in full-screen standalone mode and **receive native reminder alerts** to stay sharp with daily scenarios.
                </p>
              </div>
            </div>

            {/* Benefits Bullet Points */}
            <div className="mt-3.5 bg-muted/40 rounded-2xl p-3 border border-border/40 space-y-1.5 text-[10.5px] font-body text-muted-foreground">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                <span><strong>Keep Streaks Alive:</strong> Direct practice push reminders.</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
                <span><strong>One-Click Launch:</strong> Quick start right from your home screen.</span>
              </div>
            </div>

            {/* Call to Actions */}
            <div className="mt-4 flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInstall}
                className="flex-1 inline-flex justify-center items-center gap-1 py-2 px-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs shadow-md shadow-primary/10 cursor-pointer"
              >
                {isIOSInstallable ? "How to Install ⚡" : "Install App ⚡"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDismiss}
                className="flex-1 inline-flex justify-center items-center py-2 px-4 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 text-muted-foreground font-display font-bold text-xs transition-colors cursor-pointer"
              >
                Maybe Later
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Step-by-Step Guidance Modal */}
      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-sm overflow-hidden bg-card/95 border border-border/60 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl text-foreground relative"
            >
              <button
                onClick={() => setShowIosModal(false)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center mb-5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15 shadow-sm mb-3">
                  <Smartphone className="h-6 w-6 stroke-[1.8]" />
                </div>
                <h3 className="font-display font-extrabold text-lg tracking-tight">Install on iOS Safari</h3>
                <p className="text-xs text-muted-foreground mt-1">Add Skillful to your Home Screen in 3 simple steps:</p>
              </div>

              <div className="space-y-4 font-body text-xs text-muted-foreground">
                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Open Safari's Share Menu</p>
                    <p className="text-[11px] leading-relaxed">
                      Tap the **Share** button <Share className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" /> located at the bottom of Safari.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Add to Home Screen</p>
                    <p className="text-[11px] leading-relaxed">
                      Scroll down in the sharing options menu and select **Add to Home Screen** <PlusSquare className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" />.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Confirm Installation</p>
                    <p className="text-[11px] leading-relaxed">
                      Tap **Add** in the top-right corner <ArrowUpRight className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" /> to place the app on your home screen.
                    </p>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowIosModal(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs shadow-md shadow-primary/10 cursor-pointer"
              >
                Got It, Thanks!
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PwaInstallPrompt;
