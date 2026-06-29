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
  const config = {
    1: {
      gradient: "from-yellow-400 via-amber-400 to-orange-500",
      ring: "ring-yellow-400/40",
      icon: <Crown className="w-6 h-6 text-yellow-300 fill-yellow-300" />,
      size: "w-20 h-20",
      textSize: "text-3xl",
      label: "1st",
      shadow: "shadow-yellow-500/20",
      badge: "🥇",
    },
    2: {
      gradient: "from-slate-300 via-gray-300 to-slate-400",
      ring: "ring-slate-300/40",
      icon: <Medal className="w-5 h-5 text-slate-300" />,
      size: "w-16 h-16",
      textSize: "text-2xl",
      label: "2nd",
      shadow: "shadow-slate-400/20",
      badge: "🥈",
    },
    3: {
      gradient: "from-amber-600 via-orange-700 to-amber-800",
      ring: "ring-amber-600/40",
      icon: <Medal className="w-5 h-5 text-amber-600" />,
      size: "w-16 h-16",
      textSize: "text-2xl",
      label: "3rd",
      shadow: "shadow-amber-700/20",
      badge: "🥉",
    },
  }[place];

  const letter = (entry.display_name?.charAt(0) || "?").toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease }}
      className={`flex flex-col items-center gap-3 ${place === 1 ? "order-2 -mt-4 sm:-mt-6" : place === 2 ? "order-1" : "order-3"}`}
    >
      <div className="relative">
        {/* Glow ring */}
        <div
          className={`absolute -inset-1.5 rounded-full bg-gradient-to-br ${config.gradient} opacity-30 blur-md`}
        />
        {/* Avatar */}
        <div
          className={`relative ${config.size} rounded-full bg-gradient-to-br ${config.gradient} ring-4 ${config.ring} flex items-center justify-center text-white font-display font-bold ${config.textSize} shadow-2xl ${config.shadow}`}
        >
          {letter}
        </div>
        {/* Rank badge */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-xl">
          {config.badge}
        </div>
      </div>

      <div className="text-center mt-1">
        <p className="font-display font-bold text-foreground text-sm truncate max-w-[100px]">
          {entry.display_name}
        </p>
        <p className={`font-display font-extrabold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent ${place === 1 ? "text-2xl" : "text-xl"}`}>
          {entry.total_score.toLocaleString()}
        </p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <Target className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{entry.avg_accuracy}%</span>
        </div>
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
        <FloatingOrbs />

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_60%)]" aria-hidden />

          <div className="relative mx-auto max-w-4xl px-4 pt-10 pb-6 sm:pt-14 sm:pb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="inline-flex items-center gap-2.5 rounded-full border border-yellow-500/20 bg-yellow-500/5 px-4 py-1.5 mb-5"
            >
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-semibold tracking-wide text-foreground/80">
                Global Rankings
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.5, ease }}
              className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Leaderboard
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5, ease }}
              className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base"
            >
              Top players ranked by cumulative score across all skills. Play more, score higher, climb the ranks.
            </motion.p>

            {/* Current user rank pill */}
            {currentUserEntry && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="inline-flex items-center gap-2 mt-5 rounded-full bg-primary/10 border border-primary/20 px-5 py-2"
              >
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Your Rank: <span className="text-primary">#{currentUserEntry.rank}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  ({currentUserEntry.total_score.toLocaleString()} pts)
                </span>
              </motion.div>
            )}
          </div>
        </section>

        {/* Podium: Top 3 */}
        {!isLoading && top3.length >= 3 && (
          <section className="mx-auto max-w-lg px-4 pb-8">
            <div className="flex items-end justify-center gap-6 sm:gap-10">
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
