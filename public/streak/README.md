# Streak animations

Drop your own flame / celebration artwork in this folder to replace the
built-in animated SVG.

## Steps

1. Put your file here, e.g. `flame.webm` or `celebrate.gif`.
2. Open `src/config/streakAnimation.ts` and point the config at it:

   ```ts
   export const STREAK_FLAME_ANIMATION: StreakAnimationConfig = {
     src: "/streak/flame.webm",
     kind: "video",
     alt: "Streak flame",
   };
   ```

3. Reload the app.

`kind` is `"video"` for `.webm` / `.mp4`, or `"image"` for `.gif` / `.webp` / `.png`.

There are two independent slots:

| Config | Where it shows |
| --- | --- |
| `STREAK_FLAME_ANIMATION` | Header badge and the streak card |
| `STREAK_CELEBRATION_ANIMATION` | Full-screen overlay when the streak advances |

## Notes

- **Fallback is automatic.** If the file is missing or fails to decode, the
  component falls back to the built-in SVG flame. A wrong path can't leave a
  blank space in the UI.
- **Transparency:** use WebM with an alpha channel (VP9, `-pix_fmt yuva420p`)
  if you want it to sit on the card without a background box. Plain MP4 has no
  alpha and will show a rectangle.
- **Autoplay:** videos render muted, looping, and inline, which is what mobile
  browsers require to play without a tap. They're also paused when the user has
  "reduce motion" enabled.
- **Size:** this renders on the home screen every session — keep it small.
- **Lottie:** not bundled. Either export to WebM/GIF and use it as above, or
  add `lottie-web` and render it in `StreakFlame`'s custom-asset branch.
