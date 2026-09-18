import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Crown, Flame, Target, Zap, Users, Medal } from "lucide-react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import FloatingOrbs from "@/components/FloatingOrbs";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLeaderboard, type LeaderboardEntry } from "@/services/leaderboardService";

const ease = [0.16, 1, 0.3, 1] as const;
const spring = { type: "spring" as const, stiffness: 260, damping: 22 };

const PEDESTAL_HEIGHT = { 1: 72, 2: 52, 3: 40 } as const;

const PODIUM_CONFIG = {
  1: {
    accent: "text-amber-600",
    avatarBg: "bg-amber-500",
    avatarBorder: "border-amber-300/80",
    avatarText: "text-white",
    avatarSize: "h-[68px] w-[68px] text-2xl",
    score: "text-xl text-amber-600",
    order: "order-2",
    pedestal: "h-[72px] bg-amber-500/35",
    glow: "shadow-[0_0_28px_-6px] shadow-amber-500/45",
    badge: "bg-amber-500 text-white border-amber-300/60",
  },
  2: {
    accent: "text-slate-600",
    avatarBg: "bg-slate-400",
    avatarBorder: "border-slate-300/80",
    avatarText: "text-white",
    avatarSize: "h-14 w-14 text-xl",
    score: "text-lg text-slate-600",
    order: "order-1",
    pedestal: "h-[52px] bg-slate-400/30",
    glow: "shadow-[0_0_18px_-6px] shadow-slate-400/35",
    badge: "bg-slate-400 text-white border-slate-300/60",
  },
  3: {
    accent: "text-orange-700",
    avatarBg: "bg-orange-600",
    avatarBorder: "border-orange-400/70",
    avatarText: "text-white",
    avatarSize: "h-14 w-14 text-xl",
    score: "text-lg text-orange-700",
    order: "order-3",
    pedestal: "h-[40px] bg-orange-600/30",
    glow: "shadow-[0_0_18px_-6px] shadow-orange-500/30",
    badge: "bg-orange-600 text-white border-orange-400/60",
  },
} as const;

const ROW_AVATAR_PALETTE = [
  { bg: "bg-violet-500", border: "border-violet-400/50", text: "text-white" },
  { bg: "bg-indigo-500", border: "border-indigo-400/50", text: "text-white" },
  { bg: "bg-sky-500", border: "border-sky-400/50", text: "text-white" },
  { bg: "bg-teal-500", border: "border-teal-400/50", text: "text-white" },
  { bg: "bg-emerald-500", border: "border-emerald-400/50", text: "text-white" },
  { bg: "bg-rose-500", border: "border-rose-400/50", text: "text-white" },
  { bg: "bg-fuchsia-500", border: "border-fuchsia-400/50", text: "text-white" },
  { bg: "bg-cyan-600", border: "border-cyan-400/50", text: "text-white" },
] as const;

function getRowAvatarStyle(index: number) {
  return ROW_AVATAR_PALETTE[index % ROW_AVATAR_PALETTE.length];
}

function AccuracyBar({ value, delay }: { value: number; delay: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="mt-0.5 h-1 w-full max-w-[4.5rem] overflow-hidden rounded-full bg-muted">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ delay, duration: 0.55, ease }}
        className="h-full rounded-full bg-primary/70"
      />
    </div>
  );
}

/** Podium card for top 3 */
function PodiumCard({
  entry,
  place,
  delay,
  reduceMotion,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  delay: number;
  reduceMotion: boolean | null;
}) {
  const config = PODIUM_CONFIG[place];
  const letter = (entry.display_name?.charAt(0) || "?").toUpperCase();
  const pedestalH = PEDESTAL_HEIGHT[place];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ...spring }}
      className={`flex flex-col items-center gap-0 ${config.order} ${place === 1 ? "-mt-4" : ""}`}
    >
      <div className="relative mb-2.5">
        {place === 1 && (
          <motion.div
            className="absolute -inset-3 rounded-full bg-amber-400/20 blur-xl"
            aria-hidden
            animate={reduceMotion ? { opacity: 0.6 } : { opacity: [0.4, 0.75, 0.4], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.div
          initial={{ scale: 0, rotate: place === 1 ? -12 : 0 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: delay + 0.08, ...spring }}
          className={`relative flex items-center justify-center rounded-full border-2 font-display font-bold ${config.avatarBg} ${config.avatarBorder} ${config.avatarText} ${config.avatarSize} ${config.glow}`}
        >
          {letter}
        </motion.div>
        {place === 1 && (
          <motion.div
            className="absolute -top-3 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 6, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: delay + 0.2, ...spring }}
          >
            <motion.div
              animate={reduceMotion ? {} : { y: [0, -3, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="h-5 w-5 fill-amber-400 text-amber-400 drop-shadow-sm" />
            </motion.div>
          </motion.div>
        )}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.15, type: "spring", stiffness: 400, damping: 18 }}
          className={`absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border font-display text-[11px] font-bold ${config.badge}`}
        >
          {place}
        </motion.span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.18, duration: 0.35, ease }}
        className="mb-2 text-center"
      >
        <p className="max-w-[92px] truncate text-[13px] font-semibold text-foreground">
          {entry.display_name}
        </p>
        <motion.p
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.25, ...spring }}
          className={`font-display font-bold tabular-nums ${config.score}`}
        >
          {entry.total_score.toLocaleString()}
        </motion.p>
        <p className="text-xs tabular-nums text-muted-foreground">{entry.avg_accuracy}%</p>
      </motion.div>

      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: pedestalH, opacity: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.55, ease }}
        className={`w-[72px] origin-bottom overflow-hidden rounded-t-lg ${config.pedestal}`}
        aria-hidden
      />
    </motion.div>
  );
}

function getRankAccent(rank: number) {
  if (rank === 1) {
    return {
      rank: "text-amber-600",
      rankPill: "bg-amber-500/15 text-amber-700",
      row: "bg-amber-500/[0.07]",
      avatar: "bg-amber-500 text-white border-amber-300/50",
    };
  }
  if (rank === 2) {
    return {
      rank: "text-slate-500",
      rankPill: "bg-slate-400/15 text-slate-700",
      row: "bg-slate-400/[0.07]",
      avatar: "bg-slate-400 text-white border-slate-300/50",
    };
  }
  if (rank === 3) {
    return {
      rank: "text-orange-600",
      rankPill: "bg-orange-500/15 text-orange-700",
      row: "bg-orange-500/[0.07]",
      avatar: "bg-orange-600 text-white border-orange-400/50",
    };
  }
  return {
    rank: "text-muted-foreground",
    rankPill: "bg-muted text-muted-foreground",
    row: "",
    avatar: "",
  };
}

/** Skeleton row for loading state */
function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-4 px-4 py-3.5">
      <div className="h-8 w-8 rounded-full bg-primary/10" />
      <div className="h-8 w-8 rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-24 rounded-md bg-muted" />
        <div className="h-2.5 w-16 rounded-md bg-muted" />
      </div>
      <div className="h-5 w-16 rounded-md bg-muted" />
    </div>
  );
}

const LeaderboardPage = () => {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchLeaderboard();
      setEntries(data);
      setIsLoading(false);
    };
    load();
  }, []);

  const currentUserEntry = entries.find((e) => e.user_id === user.id);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <MainLayout>
      <div className="relative min-h-[80vh]">
        <FloatingOrbs vivid />
        <div
          className="pointer-events-none absolute inset-0 -z-[1] bg-dot-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          aria-hidden
        />

        {/* Page header */}
        <section className="relative z-10 mx-auto max-w-2xl px-4 pb-6 pt-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="flex items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0, rotate: -24 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring, delay: 0.05 }}
              className="flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <motion.div
                animate={
                  reduceMotion
                    ? {}
                    : { y: [0, -4, 0], rotate: [0, -8, 8, 0] }
                }
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Trophy className="h-6 w-6 text-amber-500" strokeWidth={2.25} />
              </motion.div>
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08, duration: 0.4, ease }}
                className="font-display text-[26px] font-bold tracking-tight sm:text-3xl"
              >
                <span className="text-gradient">Leaderboard</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.14, duration: 0.35 }}
                className="mt-0.5 text-sm text-muted-foreground"
              >
                Ranked by cumulative score across all skills.
              </motion.p>
            </div>
          </motion.div>

          {currentUserEntry && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12, ...spring }}
              className="mt-5 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.2, ...spring }}
                  >
                    <Medal className="h-4 w-4 text-primary" strokeWidth={2} />
                  </motion.div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Your rank
                  </span>
                </div>
                <span className="flex items-baseline gap-2">
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.22, type: "spring", stiffness: 320, damping: 16 }}
                    className="font-display text-xl font-bold tabular-nums text-foreground"
                  >
                    #{currentUserEntry.rank}
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="text-xs font-medium tabular-nums text-muted-foreground"
                  >
                    {currentUserEntry.total_score.toLocaleString()} pts
                  </motion.span>
                </span>
              </div>
            </motion.div>
          )}
        </section>

        {/* Podium: Top 3 */}
        {!isLoading && top3.length >= 3 && (
          <section className="relative z-10 mx-auto max-w-lg px-4 pb-6">
            <div className="flex items-end justify-center gap-5 sm:gap-8">
              <PodiumCard entry={top3[1]} place={2} delay={0.25} reduceMotion={reduceMotion} />
              <PodiumCard entry={top3[0]} place={1} delay={0.15} reduceMotion={reduceMotion} />
              <PodiumCard entry={top3[2]} place={3} delay={0.35} reduceMotion={reduceMotion} />
            </div>
          </section>
        )}

        {/* Rankings Table */}
        <section className="relative z-10 mx-auto max-w-2xl px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45, ease }}
            className="overflow-hidden rounded-2xl border border-border/80 bg-card/75 shadow-md shadow-primary/[0.06] backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 border-b border-primary/15 bg-primary/[0.06] px-4 py-2.5">
              <span className="section-label w-8 text-center text-primary/70">#</span>
              <span className="w-8" />
              <span className="section-label flex-1 text-primary/70">Player</span>
              <span className="section-label w-20 text-right text-primary/70">Score</span>
              <span className="section-label hidden w-16 text-right text-primary/70 sm:block">
                Accuracy
              </span>
              <span className="section-label hidden w-14 text-right text-primary/70 sm:block">
                Streak
              </span>
            </div>

            {isLoading && (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            )}

            {!isLoading && entries.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring}
                  className="mb-4 flex h-14 w-14 items-center justify-center"
                >
                  <Users className="h-8 w-8 text-muted-foreground" strokeWidth={1.75} />
                </motion.div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  No scores yet
                </h3>
                <p className="mb-5 mt-1 max-w-xs text-sm text-muted-foreground">
                  Complete any quiz to get on the leaderboard.
                </p>
                <Link
                  to="/skills"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start playing
                  <Zap className="h-4 w-4" />
                </Link>
              </div>
            )}

            {!isLoading && entries.length > 0 && (
              <div>
                {(top3.length >= 3 ? rest : entries).map((entry, i) => {
                  const isCurrentUser = entry.user_id === user.id;
                  const letter = (entry.display_name?.charAt(0) || "?").toUpperCase();
                  const actualIndex = top3.length >= 3 ? i + 3 : i;
                  const rankAccent = getRankAccent(entry.rank);
                  const rowAvatar = getRowAvatarStyle(i);
                  const rowDelay = 0.04 * Math.min(actualIndex, 12);
                  const hotStreak = entry.best_streak >= 5;

                  return (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: rowDelay,
                        duration: 0.35,
                        ease,
                      }}
                      whileHover={reduceMotion ? undefined : { x: 3, backgroundColor: "hsl(var(--primary) / 0.04)" }}
                      className={`flex items-center gap-4 border-b border-border/40 px-4 py-3 transition-colors last:border-0 ${
                        isCurrentUser
                          ? "bg-primary/[0.08] ring-1 ring-inset ring-primary/20"
                          : rankAccent.row || (i % 2 === 0 ? "bg-muted/20" : "bg-transparent hover:bg-primary/[0.03]")
                      }`}
                    >
                      <div className="w-8 text-center">
                        {entry.rank <= 3 ? (
                          <motion.div
                            initial={{ rotate: -120, scale: 0, opacity: 0 }}
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            transition={{
                              delay: rowDelay + 0.1,
                              ...spring,
                            }}
                          >
                            <Medal
                              className={`mx-auto h-4 w-4 ${rankAccent.rank}`}
                              strokeWidth={2}
                            />
                          </motion.div>
                        ) : (
                          <span
                            className={`inline-flex min-w-[1.75rem] justify-center rounded-md px-1 py-0.5 font-display text-xs font-bold tabular-nums ${
                              isCurrentUser ? "bg-primary/15 text-primary" : rankAccent.rankPill
                            }`}
                          >
                            {entry.rank}
                          </span>
                        )}
                      </div>

                      <motion.div
                        initial={{ scale: 0, rotate: -8 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          delay: rowDelay + 0.05,
                          type: "spring",
                          stiffness: 380,
                          damping: 20,
                        }}
                        whileHover={reduceMotion ? undefined : { scale: 1.08 }}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-sm ${
                          isCurrentUser
                            ? "border-primary/40 bg-primary text-primary-foreground shadow-primary/20"
                            : rankAccent.avatar
                              ? rankAccent.avatar
                              : `${rowAvatar.bg} ${rowAvatar.border} ${rowAvatar.text} shadow-black/5`
                        }`}
                      >
                        {letter}
                      </motion.div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {entry.display_name}
                          {isCurrentUser && (
                            <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground sm:hidden">
                          {entry.avg_accuracy}% · {entry.best_streak} streak
                        </p>
                        <div className="hidden sm:block">
                          <AccuracyBar value={entry.avg_accuracy} delay={rowDelay + 0.12} />
                        </div>
                      </div>

                      <div className="w-20 text-right">
                        <motion.span
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: rowDelay + 0.08, ...spring }}
                          className="font-display text-sm font-bold tabular-nums text-foreground"
                        >
                          {entry.total_score.toLocaleString()}
                        </motion.span>
                      </div>

                      <div className="hidden w-16 flex-col items-end sm:flex">
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
                          <span className="text-xs font-semibold tabular-nums text-foreground/90">
                            {entry.avg_accuracy}%
                          </span>
                        </span>
                      </div>

                      <div className="hidden w-14 items-center justify-end gap-1 sm:flex">
                        <motion.div
                          animate={
                            reduceMotion || !hotStreak
                              ? {}
                              : { scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] }
                          }
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Flame
                            className={`h-3.5 w-3.5 ${hotStreak ? "fill-orange-500 text-orange-500" : "text-orange-400"}`}
                            strokeWidth={2.25}
                          />
                        </motion.div>
                        <span className="text-xs font-semibold tabular-nums text-foreground/90">
                          {entry.best_streak}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {!isLoading && user.isGuest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-7 text-center"
            >
              <div className="rounded-xl border border-border bg-muted/30 p-6">
                <motion.div
                  animate={reduceMotion ? {} : { y: [0, -3, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Trophy className="mx-auto mb-3 h-7 w-7 text-amber-500" strokeWidth={1.75} />
                </motion.div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  Want to see your name here?
                </h3>
                <p className="mx-auto mb-4 mt-1 max-w-xs text-sm text-muted-foreground">
                  Sign in and complete quizzes to appear on the global leaderboard.
                </p>
                <Link
                  to="/skills"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start playing
                  <Zap className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default LeaderboardPage;
