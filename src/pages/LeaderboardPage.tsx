import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Flame, Target, Zap, ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLeaderboard, type LeaderboardEntry } from "@/services/leaderboardService";
import FloatingOrbs from "@/components/FloatingOrbs";

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
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border/40 bg-muted/30">
              <span className="w-8 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                #
              </span>
              <span className="w-8" /> {/* Avatar spacer */}
              <span className="flex-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Player
              </span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-20 text-right">
                Score
              </span>
              <span className="hidden sm:block text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-16 text-right">
                Accuracy
              </span>
              <span className="hidden sm:block text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-14 text-right">
                Streak
              </span>
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
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-1">
                  No scores yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                  Be the first to claim the top spot! Complete any quiz to get on the leaderboard.
                </p>
                <Link
                  to="/skills"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Playing
                  <Zap className="w-4 h-4" />
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
                      transition={{ delay: 0.05 * Math.min(actualIndex, 15), duration: 0.35 }}
                      className={`flex items-center gap-4 px-4 py-3.5 border-b border-border/20 last:border-0 transition-colors ${
                        isCurrentUser
                          ? "bg-primary/5 border-l-4 !border-l-primary"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center">
                        {entry.rank <= 3 ? (
                          <span className="text-lg">
                            {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                          </span>
                        ) : (
                          <span className={`font-display font-bold text-sm ${
                            isCurrentUser ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {entry.rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                          isCurrentUser
                            ? "bg-primary shadow-md shadow-primary/20"
                            : "bg-gradient-to-br from-slate-500 to-slate-600"
                        }`}
                      >
                        {letter}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          isCurrentUser ? "text-primary" : "text-foreground"
                        }`}>
                          {entry.display_name}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {entry.avg_accuracy}% · 🔥{entry.best_streak}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="w-20 text-right">
                        <span className={`font-display font-bold text-sm ${
                          isCurrentUser ? "text-primary" : "text-foreground"
                        }`}>
                          {entry.total_score.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-0.5">pts</span>
                      </div>

                      {/* Accuracy (desktop) */}
                      <div className="hidden sm:flex items-center gap-1 w-16 justify-end">
                        <Target className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {entry.avg_accuracy}%
                        </span>
                      </div>

                      {/* Streak (desktop) */}
                      <div className="hidden sm:flex items-center gap-1 w-14 justify-end">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span className="text-xs font-medium text-muted-foreground">
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
              className="mt-8 text-center"
            >
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
                <Trophy className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-lg text-foreground mb-1">
                  Want to see your name here?
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                  Sign in and complete quizzes to appear on the global leaderboard.
                </p>
                <Link
                  to="/skills"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Playing
                  <Zap className="w-4 h-4" />
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
