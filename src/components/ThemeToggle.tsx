import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { hapticLight } from "@/hooks/useHaptics";

interface ThemeToggleProps {
  /**
   * Style of the toggle:
   * - "icon": Compact header button that directly flips between dark & light.
   * - "segmented": Two-button pill control for modals/settings.
   * - "dropdown-item": Full-width button with label for mobile/profile dropdown.
   */
  variant?: "icon" | "segmented" | "dropdown-item";
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle = ({
  variant = "icon",
  className = "",
  showLabel = false,
}: ThemeToggleProps) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme || theme) === "dark" : false;

  const toggleTheme = () => {
    hapticLight();
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    if (variant === "segmented") {
      return (
        <div className={`h-8 w-full rounded-lg bg-muted/60 animate-pulse ${className}`} />
      );
    }
    return (
      <div className={`h-8 w-8 rounded-full bg-muted/60 ${className}`} />
    );
  }

  // ─── Compact Header Icon Button ───
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-card text-foreground transition-all hover:border-primary/40 hover:bg-muted/70 active:scale-95 shadow-sm ${className}`}
      >
        <motion.div
          key={isDark ? "dark" : "light"}
          initial={{ rotate: -45, scale: 0.7, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 45, scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center text-primary"
        >
          {isDark ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </motion.div>
        {showLabel && (
          <span className="ml-2 text-xs font-semibold">
            {isDark ? "Dark" : "Light"}
          </span>
        )}
      </button>
    );
  }

  // ─── Dropdown Item for Profile Menu ───
  if (variant === "dropdown-item") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/40 transition-colors font-semibold text-foreground ${className}`}
      >
        <div className="flex items-center gap-2.5">
          {isDark ? (
            <Moon className="w-4 h-4 text-primary" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <span>Appearance</span>
        </div>
        <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
          {isDark ? "Dark" : "Light"}
        </span>
      </button>
    );
  }

  // ─── Segmented Pill Switcher (Settings / Profile Modal) ───
  return (
    <div className={className}>
      {showLabel && (
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Theme
        </p>
      )}
      <div
        role="group"
        aria-label="Theme selection"
        className="flex divide-x divide-border border border-border bg-background rounded-md overflow-hidden"
      >
        <button
          type="button"
          aria-pressed={!isDark}
          onClick={() => {
            hapticLight();
            setTheme("light");
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
            !isDark
              ? "bg-foreground text-background font-bold shadow-inner"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sun className="h-3.5 w-3.5 shrink-0" />
          <span>Light</span>
          {!isDark && (
            <span className="text-[9px] uppercase tracking-wider opacity-70 ml-0.5">
              (Default)
            </span>
          )}
        </button>

        <button
          type="button"
          aria-pressed={isDark}
          onClick={() => {
            hapticLight();
            setTheme("dark");
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
            isDark
              ? "bg-foreground text-background font-bold shadow-inner"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Moon className="h-3.5 w-3.5 shrink-0" />
          <span>Dark</span>
        </button>
      </div>
    </div>
  );
};

export default ThemeToggle;
