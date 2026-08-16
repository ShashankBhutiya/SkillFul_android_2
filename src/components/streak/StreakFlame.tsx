import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { StreakAnimationConfig } from "@/config/streakAnimation";

interface StreakFlameProps {
  /** Rendered size in pixels. */
  size?: number;
  /** Dormant flames render grey — used when today isn't checked in yet. */
  active?: boolean;
  /** Longer streaks burn hotter: 0–1, drives the core's intensity. */
  intensity?: number;
  /** Optional custom asset; falls back to the built-in SVG when unset. */
  animation?: StreakAnimationConfig;
  className?: string;
}

/**
 * The streak flame.
 *
 * Renders a self-contained animated SVG by default so the feature has no
 * asset dependencies. If `animation.src` is set (see config/streakAnimation.ts)
 * that asset is used instead, with the SVG kept as the fallback for load
 * failures — a broken path degrades to the built-in art rather than a gap.
 */
export const StreakFlame = ({
  size = 40,
  active = true,
  intensity = 0.5,
  animation,
  className = "",
}: StreakFlameProps) => {
  const reduceMotion = useReducedMotion();
  const [assetFailed, setAssetFailed] = useState(false);

  const useCustomAsset = Boolean(animation?.src) && !assetFailed;

  if (useCustomAsset && animation?.src) {
    const common = {
      className: `object-contain ${active ? "" : "opacity-40 grayscale"} ${className}`,
      style: { width: size, height: size },
      onError: () => setAssetFailed(true),
    };

    if (animation.kind === "video") {
      return (
        <video
          {...common}
          src={animation.src}
          autoPlay={!reduceMotion}
          loop
          muted
          playsInline
          aria-label={animation.alt}
        />
      );
    }

    return <img {...common} src={animation.src} alt={animation.alt} />;
  }

  // ─── Built-in SVG flame ───

  // Warm core grows with the streak length.
  const coreOpacity = 0.35 + Math.min(intensity, 1) * 0.5;

  const flicker = reduceMotion
    ? {}
    : {
        scale: [1, 1.06, 0.98, 1.04, 1],
        rotate: [0, -1.5, 1.5, -1, 0],
      };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 32 40"
      fill="none"
      className={`${active ? "" : "opacity-40 grayscale"} ${className}`}
      role="img"
      aria-label="Streak flame"
      animate={flicker}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "50% 85%" }}
    >
      <defs>
        <linearGradient id="streak-flame-outer" x1="16" y1="2" x2="16" y2="38">
          <stop offset="0%" stopColor="#FDBA24" />
          <stop offset="45%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#E0492B" />
        </linearGradient>
        <linearGradient id="streak-flame-core" x1="16" y1="16" x2="16" y2="37">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      {/* Outer body */}
      <path
        d="M16 1.5c1.8 6.2 5.4 8.3 8.6 12.2 3 3.6 4.4 7 4.4 10.6 0 7.2-5.8 13.2-13 13.2S3 31.5 3 24.3c0-4.3 1.9-7.9 5-11.2 1.3 1.3 2.1 2.5 2.5 3.7C12 12 14 6.9 16 1.5Z"
        fill="url(#streak-flame-outer)"
      />

      {/* Inner core — pulses independently for a live, layered look */}
      <motion.path
        d="M16.2 15.8c1.2 3.6 3.1 4.8 4.7 7 1.3 1.8 1.9 3.5 1.9 5.3 0 3.9-3 7-6.8 7s-6.8-3.1-6.8-7c0-2.3 1-4.2 2.6-6 .6.7 1 1.3 1.2 2 .7-3 2.3-5.9 3.2-8.3Z"
        fill="url(#streak-flame-core)"
        animate={
          reduceMotion
            ? {}
            : { opacity: [coreOpacity, 1, coreOpacity], scaleY: [1, 1.1, 1] }
        }
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "50% 90%" }}
      />
    </motion.svg>
  );
};

export default StreakFlame;
