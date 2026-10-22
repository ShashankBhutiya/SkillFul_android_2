export const TUTORIAL_STORAGE_KEY = "skillful_tutorial_v1_seen";
let dismissedThisSession = false;

export function shouldShowTutorial(pathname: string) {
  if (!["/streak", "/skills", "/skills/ai", "/skills/classic"].includes(pathname) || dismissedThisSession) return false;
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) !== "true";
  } catch {
    return true;
  }
}

export function rememberTutorial() {
  dismissedThisSession = true;
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  } catch {
    // Keep dismissal in memory when device storage is unavailable.
  }
}
