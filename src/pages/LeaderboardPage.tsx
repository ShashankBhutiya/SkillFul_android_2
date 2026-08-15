import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Flame, Target, Zap, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLeaderboard, type LeaderboardEntry } from "@/services/leaderboardService";

const ease = [0.16, 1, 0.3, 1] as const;

/** Podium card for top 3 */
function PodiumCard({
  entry,
  place,
  delay,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  delay: number;
}) {
  // Rank is carried by size, a single accent colour and the numeral —
  // not by a gradient fill, a blurred glow ring and a shadow at once.
  const config = {
    1: {
      accent: "text-amber-600",
      avatar: "h-[68px] w-[68px] text-2xl border-amber-500/50",
      score: "text-xl",
      order: "order-2",
    },
    2: {
      accent: "text-muted-foreground",
      avatar: "h-14 w-14 text-xl border-border",
      score: "text-lg",
      order: "order-1",
    },
    3: {
      accent: "text-muted-foreground",
      avatar: "h-14 w-14 text-xl border-border",
      score: "text-lg",
      order: "order-3",
    },
  }[place];

  const letter = (entry.display_name?.charAt(0) || "?").toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease }}
      className={`flex flex-col items-center gap-2.5 ${config.order} ${place === 1 ? "-mt-3" : ""}`}
    >
      <div className="relative">
        <div
          className={`flex items-center justify-center rounded-full border-2 bg-muted font-display font-semibold text-foreground ${config.avatar}`}
        >
          {letter}
        </div>
        {place === 1 && (
          <Crown className="absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2 fill-amber-500 text-amber-500" />
        )}
        <span
          className={`absolute -bottom-1 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background font-display text-[11px] font-semibold ${config.accent}`}
        >
          {place}
        </span>
      </div>

      <div className="mt-1 text-center">
        <p className="max-w-[92px] truncate text-[13px] font-medium text-foreground">
          {entry.display_name}
        </p>
        <p className={`font-display font-semibold tabular-nums text-foreground ${config.score}`}>
          {entry.total_score.toLocaleString()}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">{entry.avg_accuracy}%</p>
      </div>
    </motion.div>
  );
}

/** Skeleton row for loading state */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-muted" />
      <div className="w-8 h-8 rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-muted rounded-md w-24" />
        <div className="h-2.5 bg-muted rounded-md w-16" />
      </div>
      <div className="h-5 bg-muted rounded-md w-16" />
    </div>
  );
}

const LeaderboardPage = () => {
  const { user } = useAuth();
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
        {/* Page header */}
        <section className="mx-auto max-w-2xl px-4 pt-8 pb-6">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="font-display text-[26px] font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Leaderboard
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.35, ease }}
            className="mt-1.5 text-sm text-muted-foreground"
          >
            Ranked by cumulative score across all skills.
          </motion.p>

          {/* Your standing — a plain bordered strip rather than a
              floating tinted pill. */}
          {currentUserEntry && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.35, ease }}
              className="surface mt-5 flex items-center justify-between px-4 py-3"
            >
              <span className="section-label">Your rank</span>
              <span className="flex items-baseline gap-2">
                <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                  #{currentUserEntry.rank}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {currentUserEntry.total_score.toLocaleString()} pts
                </span>
              </span>
            </motion.div>
          )}
        </section>

        {/* Podium: Top 3 */}
        {!isLoading && top3.length >= 3 && (
          <section className="mx-auto max-w-lg px-4 pb-9">
            <div className="flex items-end justify-center gap-7 sm:gap-10">
              <PodiumCard entry={top3[1]} place={2} delay={0.25} />
              <PodiumCard entry={top3[0]} place={1} delay={0.15} />
              <PodiumCard entry={top3[2]} place={3} delay={0.35} />
            </div>
          </section>
        )}

        {/* Rankings Table */}
        <section className="mx-auto max-w-2xl px-4 pb-16">
          <div className="surface overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5">
              <span className="section-label w-8 text-center">#</span>
              <span className="w-8" /> {/* Avatar spacer */}
              <span className="section-label flex-1">Player</span>
              <span className="section-label w-20 text-right">Score</span>
              <span className="section-label hidden w-16 text-right sm:block">Accuracy</span>
              <span className="section-label hidden w-14 text-right sm:block">Streak</span>
            </div>

            {/* Loading skeleton */}
            {isLoading && (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && entries.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <Users className="mb-3 h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                <h3 className="font-display text-base font-semibold text-foreground">
                  No scores yet
                </h3>
                <p className="mb-5 mt-1 max-w-xs text-sm text-muted-foreground">
                  Complete any quiz to get on the leaderboard.
                </p>
                <Link
                  to="/skills"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Start playing
                  <Zap className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Rows (show all entries, or only rest if top3 podium is shown) */}
            {!isLoading && entries.length > 0 && (
              <div>
                {(top3.length >= 3 ? rest : entries).map((entry, i) => {
                  const isCurrentUser = entry.user_id === user.id;
                  const letter = (entry.display_name?.charAt(0) || "?").toUpperCase();
                  const actualIndex = top3.length >= 3 ? i + 3 : i;

                  return (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * Math.min(actualIndex, 12), duration: 0.3 }}
                      className={`flex items-center gap-4 border-b border-border/60 px-4 py-3 transition-colors last:border-0 ${
                        isCurrentUser ? "bg-primary/[0.04]" : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center">
                        <span
                          className={`font-display text-sm font-semibold tabular-nums ${
                            isCurrentUser ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </div>

                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {letter}
                      </div>

                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry.display_name}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground sm:hidden">
                          {entry.avg_accuracy}% · {entry.best_streak} streak
                        </p>
                      </div>

                      {/* Score */}
                      <div className="w-20 text-right">
                        <span className="font-display text-sm font-semibold tabular-nums text-foreground">
                          {entry.total_score.toLocaleString()}
                        </span>
                      </div>

                      {/* Accuracy (desktop) */}
                      <div className="hidden w-16 items-center justify-end gap-1 sm:flex">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {entry.avg_accuracy}%
                        </span>
                      </div>

                      {/* Streak (desktop) */}
                      <div className="hidden w-14 items-center justify-end gap-1 sm:flex">
                        <Flame className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {entry.best_streak}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom CTA for guests */}
          {!isLoading && user.isGuest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-7 text-center"
            >
              <div className="surface p-6">
                <Trophy className="mx-auto mb-3 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                <h3 className="font-display text-base font-semibold text-foreground">
                  Want to see your name here?
                </h3>
                <p className="mx-auto mb-4 mt-1 max-w-xs text-sm text-muted-foreground">
                  Sign in and complete quizzes to appear on the global leaderboard.
                </p>
                <Link
                  to="/skills"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
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
