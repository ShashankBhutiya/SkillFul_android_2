/**
 * User mode — Student vs Professional.
 *
 * Chosen at signup and changeable any time from Profile Settings.
 * The mode FILTERS the skill catalog: a student never sees office-politics
 * or salary-negotiation topics, a professional never sees campus topics.
 *
 * Progress is deliberately NOT partitioned by mode. Practising is global, so
 * switching modes only changes what is visible — hidden progress is intact
 * and reappears when the user switches back.
 */

export type UserMode = "student" | "professional";

/** Which modes a category is offered to. "both" shows up in either mode. */
export type CategoryAudience = UserMode | "both";

export const USER_MODE_KEY = "user_mode";

export const DEFAULT_USER_MODE: UserMode = "professional";

export const USER_MODES: {
    value: UserMode;
    label: string;
    tagline: string;
    description: string;
}[] = [
        {
            value: "student",
            label: "Student",
            tagline: "College or university",
            description:
                "Placements, internships, exams, money, campus life — the decisions that shape the next few years.",
        },
        {
            value: "professional",
            label: "Working professional",
            tagline: "In the workforce",
            description:
                "Office politics, leadership, salary negotiation, investing — the decisions that shape a career.",
        },
    ];

export function isUserMode(value: unknown): value is UserMode {
    return value === "student" || value === "professional";
}

/** Read the stored mode. Returns null when the user has never chosen one. */
export function getStoredUserMode(): UserMode | null {
    try {
        const saved = localStorage.getItem(USER_MODE_KEY);
        return isUserMode(saved) ? saved : null;
    } catch (e) {
        console.warn("Could not read user_mode from localStorage:", e);
        return null;
    }
}

export function setStoredUserMode(mode: UserMode): void {
    try {
        localStorage.setItem(USER_MODE_KEY, mode);
    } catch (e) {
        console.warn("Could not save user_mode to localStorage:", e);
    }
}

export function clearStoredUserMode(): void {
    try {
        localStorage.removeItem(USER_MODE_KEY);
    } catch (e) {
        console.warn("Could not clear user_mode from localStorage:", e);
    }
}

/** Does a category belong in the given mode? */
export function isCategoryInMode(
    audience: CategoryAudience | undefined,
    mode: UserMode
): boolean {
    if (!audience || audience === "both") return true;
    return audience === mode;
}

/** Section headings differ per mode so the catalog reads right to each audience. */
export const MODE_SECTIONS: Record<
    UserMode,
    { primary: { title: string; subtitle: string }; secondary: { title: string; subtitle: string } }
> = {
    student: {
        primary: { title: "Studies & Career", subtitle: "Placements, internships, exams" },
        secondary: { title: "Campus & Life", subtitle: "Money, friendships, wellbeing" },
    },
    professional: {
        primary: { title: "Professional", subtitle: "Career & workplace" },
        secondary: { title: "Personal", subtitle: "Life & relationships" },
    },
};
