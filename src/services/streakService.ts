/**
 * Daily usage streak service.
 *
 * Tracks consecutive days of app usage, with a pool of "streak freezes"
 * that absorb missed days automatically so a single skipped day doesn't
 * wipe a long streak.
 *
 * Storage follows the same pattern as progressService:
 *   - AUTH USERS: localStorage cache + Supabase sync.
 *   - GUESTS:     in-memory only + Supabase sync (no local cache).
 *
 * All date maths runs in the user's LOCAL timezone, keyed by "YYYY-MM-DD".
 * Using UTC here would roll the streak over at the wrong hour for most of
 * the world, which is exactly when a user is most likely to be practising.
 */
import { supabase } from "@/lib/supabase";

const LOCAL_KEY = "skillful_streak";

// ───────── Tuning ─────────

/** Freezes a user can bank at once. */
export const MAX_FREEZES = 3;

/** Every N consecutive days, the user earns one freeze (up to MAX_FREEZES). */
export const DAYS_PER_EARNED_FREEZE = 5;

/** Streak lengths that trigger the celebration overlay. */
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

// ───────── Types ─────────

export interface StreakState {
  /** Consecutive days, counting today if already checked in. */
  current: number;
  /** Best streak ever reached. */
  longest: number;
  /** Last day the user was active, "YYYY-MM-DD" local, or null if never. */
  lastActiveDate: string | null;
  /** Freezes currently banked. */
  freezes: number;
  /** Dates a freeze was spent on, most recent last. */
  freezesUsed: string[];
  /** Recent active dates (newest last), capped — powers the week strip. */
  history: string[];
  /** Total days the user has ever checked in. */
  totalDays: number;
}

export interface CheckInResult {
  state: StreakState;
  /** True when this call was the first check-in of the day. */
  isNewDay: boolean;
  /** Days covered by spending freezes during this check-in. */
  freezesSpent: number;
  /** True when the streak broke despite (or for want of) freezes. */
  streakBroken: boolean;
  /** Freezes earned by crossing a DAYS_PER_EARNED_FREEZE boundary. */
  freezesEarned: number;
  /** Milestone reached on this check-in, if any. */
  milestone: number | null;
}

/** Keep roughly two months of history — enough for any strip we render. */
const MAX_HISTORY = 60;

export const EMPTY_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
  freezes: 0,
  freezesUsed: [],
  history: [],
  totalDays: 0,
};

// ───────── Date helpers (local timezone) ─────────

/** "YYYY-MM-DD" for a Date, in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" into a local-midnight Date. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/**
 * Whole days from `a` to `b`, both "YYYY-MM-DD".
 *
 * Both sides are normalised to local midnight before subtracting, so DST
 * transitions (a 23- or 25-hour day) can't produce a fractional result.
 */
export function daysBetween(a: string, b: string): number {
  const start = fromDateKey(a).getTime();
  const end = fromDateKey(b).getTime();
  return Math.round((end - start) / 86_400_000);
}

/** Date key `offset` days from today (negative = past). */
export function dateKeyOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toDateKey(d);
}

// ───────── Storage ─────────

function isGuest(userId: string): boolean {
  return userId.startsWith("guest_");
}

let guestMemoryCache: StreakState | null = null;

function normalize(raw: Partial<StreakState> | null): StreakState {
  if (!raw) return { ...EMPTY_STREAK };
  return {
    current: raw.current ?? 0,
    longest: raw.longest ?? 0,
    lastActiveDate: raw.lastActiveDate ?? null,
    freezes: Math.min(raw.freezes ?? 0, MAX_FREEZES),
    freezesUsed: raw.freezesUsed ?? [],
    history: raw.history ?? [],
    totalDays: raw.totalDays ?? 0,
  };
}

function readCache(userId: string): StreakState {
  if (isGuest(userId)) return normalize(guestMemoryCache);
  try {
    return normalize(JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"));
  } catch {
    return { ...EMPTY_STREAK };
  }
}

function writeCache(userId: string, state: StreakState) {
  if (isGuest(userId)) {
    guestMemoryCache = state;
    return;
  }
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[streakService] Could not persist streak locally:", e);
  }
}

export function clearGuestStreakCache() {
  guestMemoryCache = null;
}

// ───────── Core logic ─────────

/**
 * Apply the passage of time to a stored streak WITHOUT recording a visit.
 *
 * Used for display: if a user opens the app after missing days, the number
 * on screen should already reflect the freezes that will be spent, rather
 * than showing a stale value until they happen to finish a quiz.
 *
 * Pure — no I/O, no clock reads beyond `today`.
 */
export function projectStreak(state: StreakState, today = todayKey()): {
  state: StreakState;
  freezesSpent: number;
  streakBroken: boolean;
} {
  if (!state.lastActiveDate || state.current === 0) {
    return { state, freezesSpent: 0, streakBroken: false };
  }

  const gap = daysBetween(state.lastActiveDate, today);

  // Same day, or the next day with nothing yet missed.
  if (gap <= 1) return { state, freezesSpent: 0, streakBroken: false };

  // A clock change or edited device date put "today" behind the last
  // recorded visit. Leave the streak alone rather than punishing it.
  if (gap < 0) return { state, freezesSpent: 0, streakBroken: false };

  const missedDays = gap - 1;

  if (missedDays <= state.freezes) {
    // Freezes cover the whole gap: streak survives, freezes are spent.
    const spentDates: string[] = [];
    for (let i = missedDays; i >= 1; i--) {
      spentDates.push(dateKeyOffsetFrom(today, -i));
    }
    return {
      state: {
        ...state,
        freezes: state.freezes - missedDays,
        freezesUsed: [...state.freezesUsed, ...spentDates].slice(-MAX_HISTORY),
        // The streak is preserved but not advanced — today isn't a visit yet.
        lastActiveDate: dateKeyOffsetFrom(today, -1),
      },
      freezesSpent: missedDays,
      streakBroken: false,
    };
  }

  // Not enough freezes — the streak is gone. Banked freezes are kept;
  // they were earned, and losing them on top of the streak is punitive.
  return {
    state: { ...state, current: 0 },
    freezesSpent: 0,
    streakBroken: true,
  };
}

/** Date key `offset` days from an arbitrary key. */
function dateKeyOffsetFrom(key: string, offset: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + offset);
  return toDateKey(d);
}

/**
 * Record today's visit and advance the streak.
 *
 * Safe to call repeatedly — only the first call each local day changes
 * the streak count.
 */
export function computeCheckIn(previous: StreakState, today = todayKey()): CheckInResult {
  // Already counted today: nothing changes.
  if (previous.lastActiveDate === today) {
    return {
      state: previous,
      isNewDay: false,
      freezesSpent: 0,
      streakBroken: false,
      freezesEarned: 0,
      milestone: null,
    };
  }

  const projected = projectStreak(previous, today);
  const base = projected.state;

  // Continue if the projection left us adjacent to today; otherwise restart.
  const continues =
    base.current > 0 &&
    base.lastActiveDate !== null &&
    daysBetween(base.lastActiveDate, today) === 1;

  const current = continues ? base.current + 1 : 1;

  // Earn a freeze on each DAYS_PER_EARNED_FREEZE boundary, capped.
  const crossedBoundary = current % DAYS_PER_EARNED_FREEZE === 0;
  const freezesEarned = crossedBoundary && base.freezes < MAX_FREEZES ? 1 : 0;

  const history = [...base.history, today].slice(-MAX_HISTORY);

  const state: StreakState = {
    current,
    longest: Math.max(base.longest, current),
    lastActiveDate: today,
    freezes: Math.min(base.freezes + freezesEarned, MAX_FREEZES),
    freezesUsed: base.freezesUsed,
    history,
    totalDays: base.totalDays + 1,
  };

  return {
    state,
    isNewDay: true,
    freezesSpent: projected.freezesSpent,
    streakBroken: projected.streakBroken,
    freezesEarned,
    milestone: MILESTONES.includes(current) ? current : null,
  };
}

// ───────── Public API (cache + Supabase) ─────────

/** Read the current streak, with elapsed-time effects already applied. */
export function getStreak(userId?: string): StreakState {
  if (!userId) return { ...EMPTY_STREAK };
  return projectStreak(readCache(userId)).state;
}

/**
 * Record a visit for today and persist it.
 *
 * Returns the full result so the UI can celebrate a milestone, warn that
 * freezes were spent, or stay quiet when it's a repeat visit.
 */
export async function checkIn(userId: string): Promise<CheckInResult> {
  const result = computeCheckIn(readCache(userId));

  // Nothing changed — skip the write entirely.
  if (!result.isNewDay && result.freezesSpent === 0 && !result.streakBroken) {
    return result;
  }

  writeCache(userId, result.state);
  await syncToSupabase(userId, result.state);
  return result;
}

/**
 * Spend a freeze manually.
 *
 * Freezes are normally consumed automatically, but this backs an explicit
 * "use a freeze" affordance where the product wants one.
 */
export async function spendFreeze(userId: string): Promise<StreakState> {
  const state = getStreak(userId);
  if (state.freezes <= 0) return state;

  const next: StreakState = {
    ...state,
    freezes: state.freezes - 1,
    freezesUsed: [...state.freezesUsed, todayKey()].slice(-MAX_HISTORY),
  };

  writeCache(userId, next);
  await syncToSupabase(userId, next);
  return next;
}

/** Grant freezes (rewards, referrals, purchases). Respects MAX_FREEZES. */
export async function grantFreezes(userId: string, count: number): Promise<StreakState> {
  const state = getStreak(userId);
  const next: StreakState = {
    ...state,
    freezes: Math.min(state.freezes + count, MAX_FREEZES),
  };

  writeCache(userId, next);
  await syncToSupabase(userId, next);
  return next;
}

// ───────── Supabase sync ─────────

async function syncToSupabase(userId: string, state: StreakState): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from("user_streaks").upsert(
      {
        user_id: userId,
        current_streak: state.current,
        longest_streak: state.longest,
        last_active_date: state.lastActiveDate,
        freezes: state.freezes,
        freezes_used: state.freezesUsed,
        history: state.history,
        total_days: state.totalDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } catch (err) {
    // Offline or table not migrated yet — the local cache is still correct,
    // so the streak keeps working and syncs on a later call.
    console.warn("[streakService] Failed to sync streak to Supabase:", err);
  }
}

/**
 * Pull the server copy and merge it with the local cache.
 *
 * Merge rather than overwrite: the same account on two devices should end
 * up with the better of the two records, not whichever synced last.
 */
export async function pullStreakFromDB(userId: string): Promise<StreakState> {
  const local = readCache(userId);
  if (!supabase) return projectStreak(local).state;

  try {
    const { data } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) return projectStreak(local).state;

    const remote: StreakState = normalize({
      current: data.current_streak,
      longest: data.longest_streak,
      lastActiveDate: data.last_active_date,
      freezes: data.freezes,
      freezesUsed: data.freezes_used ?? [],
      history: data.history ?? [],
      totalDays: data.total_days,
    });

    // Prefer whichever record saw activity most recently; take the
    // best-ever values for the monotonic fields.
    const localNewer =
      local.lastActiveDate && remote.lastActiveDate
        ? daysBetween(remote.lastActiveDate, local.lastActiveDate) > 0
        : Boolean(local.lastActiveDate);

    const winner = localNewer ? local : remote;
    const merged: StreakState = {
      ...winner,
      longest: Math.max(local.longest, remote.longest),
      totalDays: Math.max(local.totalDays, remote.totalDays),
      freezes: Math.max(local.freezes, remote.freezes),
      history: [...new Set([...local.history, ...remote.history])]
        .sort()
        .slice(-MAX_HISTORY),
    };

    const projected = projectStreak(merged).state;
    writeCache(userId, projected);
    return projected;
  } catch (err) {
    console.warn("[streakService] Failed to pull streak from Supabase:", err);
    return projectStreak(local).state;
  }
}
