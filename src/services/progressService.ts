/**
 * Progress service: syncs practiced question IDs to Supabase.
 * 
 * Update as per request:
 * - GUESTS: Progress is SAVED to Supabase (persistent) but NOT stored in localStorage (no local cache).
 * - AUTH USERS: Progress saved to Supabase + localStorage cache for speed.
 *
 * This ensures guest progress is persistent (via guest_id) but follows the "no local storage" rule.
 */
import { supabase } from "@/lib/supabase";

const LOCAL_KEY = "quiz_practiced_questions";

function isGuest(userId: string): boolean {
    return userId.startsWith("guest_");
}

// ───────── localStorage helpers (only for logged-in users) ─────────
function getLocalData(): Record<string, number[]> {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    } catch {
        return {};
    }
}

function setLocalData(data: Record<string, number[]>) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

// ───────── In-Memory Cache for Guests (since no localStorage allowed) ─────────
let guestMemoryCache: Record<string, number[]> = {};

// ───────── Public API ─────────

/** Get practiced IDs for a category */
export function getPracticedIds(categoryId: string, userId?: string): number[] {
    if (!userId) return [];

    if (isGuest(userId)) {
        // Return from memory cache (which is populated by pullProgressFromDB)
        return guestMemoryCache[categoryId] || [];
    }

    // Auth users use local storage cache
    return getLocalData()[categoryId] || [];
}

/** Save one or more practiced IDs. */
export async function savePracticedIds(
    userId: string,
    categoryId: string,
    ids: number[]
): Promise<void> {
    // 1. Update Cache
    if (isGuest(userId)) {
        // Guest: Update memory only
        const existing = new Set(guestMemoryCache[categoryId] || []);
        ids.forEach((id) => existing.add(id));
        guestMemoryCache[categoryId] = [...existing];
    } else {
        // Auth: Update localStorage
        const data = getLocalData();
        const existing = new Set(data[categoryId] || []);
        ids.forEach((id) => existing.add(id));
        data[categoryId] = [...existing];
        setLocalData(data);
    }

    // 2. Sync to Supabase (ALWAYS, for both Guest and Auth)
    if (supabase) {
        try {
            // Optimistic update: We assume it succeeds.
            const { data: row } = await supabase
                .from("user_progress")
                .select("practiced_ids")
                .eq("user_id", userId)
                .eq("category_id", categoryId)
                .maybeSingle();

            if (row) {
                // Merge with server data to be safe
                const merged = [...new Set([...row.practiced_ids, ...ids])];
                await supabase
                    .from("user_progress")
                    .update({ practiced_ids: merged, updated_at: new Date().toISOString() })
                    .eq("user_id", userId)
                    .eq("category_id", categoryId);
            } else {
                // Create new row
                await supabase.from("user_progress").insert({
                    user_id: userId,
                    category_id: categoryId,
                    practiced_ids: ids, // Initialize with current set
                });
            }
        } catch (err) {
            console.warn("Supabase sync failed:", err);
        }
    }
}

/** Pull progress from Supabase → Cache */
export async function pullProgressFromDB(userId: string): Promise<void> {
    if (!supabase) return;

    try {
        const { data: rows } = await supabase
            .from("user_progress")
            .select("category_id, practiced_ids")
            .eq("user_id", userId);

        if (!rows || rows.length === 0) return;

        if (isGuest(userId)) {
            // Populate memory cache
            rows.forEach(row => {
                guestMemoryCache[row.category_id] = row.practiced_ids;
            });
        } else {
            // Populate localStorage
            const local = getLocalData();
            for (const row of rows) {
                // Merge server data with local data
                const merged = [...new Set([...(local[row.category_id] || []), ...row.practiced_ids])];
                local[row.category_id] = merged;
            }
            setLocalData(local);
        }
    } catch (err) {
        console.warn("Failed to pull progress from DB:", err);
    }
}

/** Reset practiced IDs for a category */
export async function resetPracticedIds(
    userId: string,
    categoryId: string
): Promise<void> {
    if (isGuest(userId)) {
        delete guestMemoryCache[categoryId];
    } else {
        const data = getLocalData();
        delete data[categoryId];
        setLocalData(data);
    }

    if (supabase) {
        try {
            await supabase
                .from("user_progress")
                .delete()
                .eq("user_id", userId)
                .eq("category_id", categoryId);
        } catch (err) {
            console.warn("Supabase reset failed:", err);
        }
    }
}

/** Get total practiced count for a category */
export function getTotalPracticed(categoryId: string, userId?: string): number {
    return getPracticedIds(categoryId, userId).length;
}

/** Clear the guest in-memory cache completely */
export function clearGuestMemoryCache(): void {
    guestMemoryCache = {};
}
