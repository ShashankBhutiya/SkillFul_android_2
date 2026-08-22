import { useCallback, useEffect, useState } from "react";
import {
    DEFAULT_USER_MODE,
    USER_MODE_KEY,
    getStoredUserMode,
    setStoredUserMode,
    type UserMode,
} from "@/config/userMode";

/**
 * Custom event so every mounted consumer re-renders when the mode changes.
 * `storage` only fires in *other* tabs, so it cannot carry same-tab updates.
 */
const MODE_EVENT = "user-mode-change";

export function broadcastUserMode(mode: UserMode) {
    setStoredUserMode(mode);
    window.dispatchEvent(new CustomEvent<UserMode>(MODE_EVENT, { detail: mode }));
}

interface UseUserModeResult {
    /** The active mode. Falls back to the default until a choice is stored. */
    mode: UserMode;
    /** True once localStorage has been read — render nothing before this. */
    ready: boolean;
    /** False when the user has never picked a mode, so we know to ask. */
    hasChosen: boolean;
    setMode: (mode: UserMode) => void;
}

export function useUserMode(): UseUserModeResult {
    const [mode, setModeState] = useState<UserMode>(DEFAULT_USER_MODE);
    const [hasChosen, setHasChosen] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const stored = getStoredUserMode();
        if (stored) {
            setModeState(stored);
            setHasChosen(true);
        }
        setReady(true);
    }, []);

    useEffect(() => {
        const onModeEvent = (e: Event) => {
            const next = (e as CustomEvent<UserMode>).detail;
            setModeState(next);
            setHasChosen(true);
        };
        const onStorage = (e: StorageEvent) => {
            if (e.key !== USER_MODE_KEY) return;
            const stored = getStoredUserMode();
            if (stored) {
                setModeState(stored);
                setHasChosen(true);
            }
        };

        window.addEventListener(MODE_EVENT, onModeEvent);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener(MODE_EVENT, onModeEvent);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    const setMode = useCallback((next: UserMode) => {
        broadcastUserMode(next);
    }, []);

    return { mode, ready, hasChosen, setMode };
}
