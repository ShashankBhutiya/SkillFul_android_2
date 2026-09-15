import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/hooks/useUserMode";
import { useStreak } from "@/hooks/useStreak";
import { todayKey } from "@/services/streakService";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import StreakDetails from "./StreakDetails";

export default function DailyStreakPrompt() {
  const { user, isLoading } = useAuth();
  const { ready, hasChosen } = useUserMode();
  const { streak, checkedInToday, isHydrated } = useStreak();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const shown = useRef<string | null>(null);
  const isAppRoute = /^\/(skills(?:\/|$)|info$|leaderboard$|refer$|premium$)/.test(pathname);
  const eligible = !isLoading && ready && hasChosen && isHydrated && isAppRoute;

  useEffect(() => {
    if (!eligible) {
      setOpen(false);
      return;
    }
    const showDailyStreak = () => {
      const key = `${user.id}:${todayKey()}`;
      if (shown.current === key) return;
      shown.current = key;
      setOpen(true);
    };
    showDailyStreak();
    const onVisibility = () => {
      if (document.visibilityState === "visible") showDailyStreak();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const listener = Capacitor.isNativePlatform()
      ? CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) showDailyStreak();
        })
      : null;
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void listener?.then((handle) => handle.remove());
    };
  }, [eligible, user.id]);

  return (
    <Dialog open={open && eligible} onOpenChange={setOpen}>
      <DialogContent className="inset-0 left-0 top-0 flex h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto border-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:rounded-none motion-reduce:animate-none">
        <div className="mx-auto my-auto w-full max-w-md py-4">
          <DialogTitle className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">Your daily streak</DialogTitle>
          <DialogDescription className="sr-only">Your daily practice progress. AI and classic questions both count.</DialogDescription>
          <StreakDetails streak={streak} checkedInToday={checkedInToday} />
          <button onClick={() => setOpen(false)} className="mt-7 w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground">{checkedInToday ? "Continue" : "Let's practise"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
