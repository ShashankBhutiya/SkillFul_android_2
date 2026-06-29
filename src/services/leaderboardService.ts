/**
 * Leaderboard service: manages submitting scores and fetching the global leaderboard.
 *
 * - Only authenticated users can submit scores.
 * - Uses "keep best" logic: only updates if new score > existing score for that
 *   user + category + difficulty combination.
 */
import { supabase } from "@/lib/supabase";
import { addNotification } from "@/services/notificationService";
import { toast } from "@/hooks/use-toast";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  total_score: number;
  total_correct: number;
  total_questions: number;
  best_streak: number;
  avg_accuracy: number;
}

export interface SubmitScoreParams {
  userId: string;
  displayName: string;
  categoryId: string;
  difficulty: "easy" | "intermediate";
  score: number;
  correctCount: number;
  totalQuestions: number;
  bestStreak: number;
  accuracyPct: number;
}

/**
 * Detect who was surpassed.
 */
function detectSurpasses(
  oldLeaderboard: LeaderboardEntry[],
  newLeaderboard: LeaderboardEntry[],
  currentUserId: string
): LeaderboardEntry[] {
  const oldEntry = oldLeaderboard.find((e) => e.user_id === currentUserId);
  const oldRank = oldEntry ? Number(oldEntry.rank) : Infinity;

  const newEntry = newLeaderboard.find((e) => e.user_id === currentUserId);
  if (!newEntry) return [];
  const newRank = Number(newEntry.rank);

  if (newRank >= oldRank) return [];

  const surpassed: LeaderboardEntry[] = [];

  for (const newU of newLeaderboard) {
    if (newU.user_id === currentUserId) continue;

    const newURank = Number(newU.rank);
    if (newURank > newRank) {
      const oldU = oldLeaderboard.find((e) => e.user_id === newU.user_id);
      if (oldU) {
        const oldURank = Number(oldU.rank);
        if (oldURank < oldRank) {
          surpassed.push(newU);
        }
      }
    }
  }

  return surpassed;
}

/**
 * Format a friendly notification message for the current user listing who they surpassed.
 */
function formatSurpassedMessage(surpassed: LeaderboardEntry[]): string {
  if (surpassed.length === 1) {
    return `You just surpassed ${surpassed[0].display_name} on the leaderboard!`;
  }
  if (surpassed.length === 2) {
    return `You just surpassed ${surpassed[0].display_name} and ${surpassed[1].display_name} on the leaderboard!`;
  }
  return `You just surpassed ${surpassed[0].display_name}, ${surpassed[1].display_name}, and ${surpassed.length - 2} others on the leaderboard!`;
}

/**
 * Runs the leaderboard surpass detection asynchronously in the background.
 */
async function runSurpassDetection(
  userId: string,
  displayName: string,
  oldLeaderboard: LeaderboardEntry[]
): Promise<void> {
  if (!supabase || oldLeaderboard.length === 0) return;

  const newLeaderboard = await fetchLeaderboard();
  if (newLeaderboard.length === 0) return;

  const surpassed = detectSurpasses(oldLeaderboard, newLeaderboard, userId);
  if (surpassed.length === 0) return;

  // 1. Notify the users who were surpassed (persist in DB)
  for (const B of surpassed) {
    try {
      await supabase.from("user_notifications").insert({
        user_id: B.user_id,
        title: "Leaderboard update 🏆",
        description: `${displayName} surpassed you on the global leaderboard!`,
        type: "leaderboard",
        action_url: "/leaderboard",
        action_label: "View Leaderboard",
      });
    } catch (err) {
      console.warn(`Failed to send surpass notification to user ${B.user_id}:`, err);
    }
  }

  // 2. Notify current user locally in their inbox
  const message = formatSurpassedMessage(surpassed);
  addNotification(
    "Rank Up! 🚀",
    message,
    "leaderboard",
    "/leaderboard",
    "View Leaderboard"
  );

  // 3. Show a real-time toast alert
  toast({
    title: "Rank Up! 🚀",
    description: message,
  });
}

/**
 * Submit a quiz score to the leaderboard.
 * Uses "keep best" logic — only updates if new score is higher.
 */
export async function submitScore(params: SubmitScoreParams): Promise<void> {
  if (!supabase) return;

  const {
    userId,
    displayName,
    categoryId,
    difficulty,
    score,
    correctCount,
    totalQuestions,
    bestStreak,
    accuracyPct,
  } = params;

  try {
    // Fetch old leaderboard before database write
    const oldLeaderboard = await fetchLeaderboard().catch(() => [] as LeaderboardEntry[]);
    let shouldCheckSurpass = false;

    // Check for existing row
    const { data: existing } = await supabase
      .from("leaderboard_scores")
      .select("id, score, best_streak")
      .eq("user_id", userId)
      .eq("category_id", categoryId)
      .eq("difficulty", difficulty)
      .maybeSingle();

    if (existing) {
      // Only update if new score is better
      if (score > existing.score) {
        shouldCheckSurpass = true;
        await supabase
          .from("leaderboard_scores")
          .update({
            display_name: displayName,
            score,
            correct_count: correctCount,
            total_questions: totalQuestions,
            best_streak: Math.max(bestStreak, existing.best_streak),
            accuracy_pct: accuracyPct,
            played_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else if (bestStreak > existing.best_streak) {
        // Even if score isn't better, update best_streak if it improved
        await supabase
          .from("leaderboard_scores")
          .update({ best_streak: bestStreak })
          .eq("id", existing.id);
      }
    } else {
      // Insert new row
      shouldCheckSurpass = true;
      await supabase.from("leaderboard_scores").insert({
        user_id: userId,
        display_name: displayName,
        category_id: categoryId,
        difficulty,
        score,
        correct_count: correctCount,
        total_questions: totalQuestions,
        best_streak: bestStreak,
        accuracy_pct: accuracyPct,
      });
    }

    // Run surpass detection if cumulative score increased
    if (shouldCheckSurpass && oldLeaderboard.length > 0) {
      runSurpassDetection(userId, displayName, oldLeaderboard).catch((err) => {
        console.warn("Surpass detection failed:", err);
      });
    }
  } catch (err) {
    console.warn("Leaderboard score submission failed:", err);
  }
}

/**
 * Fetch the global leaderboard (top 50 players by cumulative score).
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.rpc("get_global_leaderboard");
    if (error) throw error;
    return (data as LeaderboardEntry[]) || [];
  } catch (err) {
    console.warn("Failed to fetch leaderboard:", err);
    return [];
  }
}
