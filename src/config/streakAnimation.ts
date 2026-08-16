/**
 * ─────────────────────────────────────────────────────────────
 *  DROP YOUR OWN STREAK ANIMATION IN HERE
 * ─────────────────────────────────────────────────────────────
 *
 * The app ships with a hand-built animated SVG flame that needs no
 * assets and works offline. If you'd rather use your own artwork —
 * a Lottie export, a looping video, an animated GIF/WebP — put the
 * file in `public/streak/` and point the entries below at it.
 *
 * HOW TO ADD ONE
 *   1. Save your file into `public/streak/`,
 *      e.g. `public/streak/flame.webm` or `public/streak/flame.gif`.
 *   2. Set `src` below to the public path, e.g. "/streak/flame.webm".
 *   3. Set `kind` to "video" or "image" to match the file.
 *   4. Reload. If the file 404s or fails to decode, the component
 *      silently falls back to the built-in SVG, so a bad path can
 *      never leave an empty hole in the UI.
 *
 * VIDEO NOTES
 *   - Use a transparent-background format if you want it to sit on
 *     the card cleanly: WebM with alpha (VP9 `-pix_fmt yuva420p`)
 *     or HEVC-with-alpha for Safari. A plain MP4 shows its own
 *     background box.
 *   - Videos are muted, looping, inline and autoplay — required for
 *     mobile browsers to play them without a tap.
 *   - Keep it small; this renders on the home screen every session.
 *
 * LOTTIE NOTES
 *   Lottie needs a runtime library, which isn't bundled here. Either
 *   export your Lottie to WebM/GIF and use it as above, or install
 *   `lottie-web` and render it inside StreakFlame's custom branch.
 */

export type StreakAnimationKind = "video" | "image";

export interface StreakAnimationConfig {
  /** Public path to the asset, or null to use the built-in SVG flame. */
  src: string | null;
  /** How to render `src`. Ignored when src is null. */
  kind: StreakAnimationKind;
  /** Describes the animation for screen readers. */
  alt: string;
}

/** The idle flame shown next to the streak count. */
export const STREAK_FLAME_ANIMATION: StreakAnimationConfig = {
  src: null, // e.g. "/streak/flame.webm"
  kind: "video",
  alt: "Streak flame",
};

/** The bigger celebration shown when the streak advances. */
export const STREAK_CELEBRATION_ANIMATION: StreakAnimationConfig = {
  src: null, // e.g. "/streak/celebrate.webm"
  kind: "video",
  alt: "Streak celebration",
};
