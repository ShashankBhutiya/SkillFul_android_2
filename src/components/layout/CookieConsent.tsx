import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Cookie, Settings, Check, X } from "lucide-react";
import { updateGAConsent } from "@/utils/analytics";
import { useLocation } from "react-router-dom";

export const CookieConsent = () => {
  const { pathname } = useLocation();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent_choice");
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    } else {
      const isAnalyticsAllowed = localStorage.getItem("cookie_consent_analytics") === "true";
      updateGAConsent(isAnalyticsAllowed);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("cookie_consent_choice", "accepted");
    localStorage.setItem("cookie_consent_analytics", "true");
    updateGAConsent(true);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    localStorage.setItem("cookie_consent_choice", "rejected");
    localStorage.setItem("cookie_consent_analytics", "false");
    updateGAConsent(false);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem("cookie_consent_choice", "custom");
    localStorage.setItem("cookie_consent_analytics", analyticsConsent ? "true" : "false");
    updateGAConsent(analyticsConsent);
    setShowBanner(false);
  };

  // Show the existing consent controls after account setup, keeping the
  // first-run form and its bottom actions unobstructed on small screens.
  if (pathname === "/onboarding") return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-5 rounded-2xl bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl text-foreground font-body"
        >
          <div className="flex items-start gap-3.5 mb-3.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Cookie className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-base leading-snug">
                Cookie Preferences
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                We use cookies to improve your learning experience, analyze quiz performance, and save your streak settings. Read our{" "}
                <a href="/privacy" className="text-primary hover:underline font-medium">
                  Privacy Policy
                </a>{" "}
                for details.
              </p>
            </div>
          </div>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-white/10 pt-3.5 mt-3.5 space-y-3.5"
              >
                {/* Necessary Cookies */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-semibold flex items-center gap-1.5">
                      Necessary Cookies <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    </h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Required for login sessions and settings memory.
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted">
                    Always On
                  </span>
                </div>

                {/* Analytical Cookies */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-semibold">Analytical Cookies (Google Analytics)</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Helps us analyze swipe response time, quiz drop-offs, and stats.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={analyticsConsent}
                      onChange={(e) => setAnalyticsConsent(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-1 border-t border-white/5">
            {showDetails ? (
              <>
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-primary text-primary-foreground font-display font-medium text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Save Choices
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="py-2 px-3 rounded-xl bg-secondary text-secondary-foreground font-display font-medium text-xs hover:bg-secondary/80 active:scale-95 transition-all flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Accept All
                </button>
                <button
                  onClick={handleRejectAll}
                  className="py-2 px-3.5 rounded-xl bg-secondary text-secondary-foreground font-display font-medium text-xs hover:bg-secondary/80 active:scale-95 transition-all"
                >
                  Reject
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className="p-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 transition-all"
                  title="Customize Preferences"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
