/** Haptic feedback helper — uses Vibration API (mobile) */

export function hapticLight() {
    try { navigator.vibrate?.(10); } catch { }
}

export function hapticMedium() {
    try { navigator.vibrate?.(25); } catch { }
}

export function hapticHeavy() {
    try { navigator.vibrate?.(50); } catch { }
}

/** Double-tap pattern for correct answers */
export function hapticSuccess() {
    try { navigator.vibrate?.([15, 50, 15]); } catch { }
}

/** Rumble pattern for wrong answers */
export function hapticError() {
    try { navigator.vibrate?.([40, 30, 40, 30, 60]); } catch { }
}

/** Celebration pattern for milestones */
export function hapticCelebration() {
    try { navigator.vibrate?.([10, 30, 10, 30, 10, 30, 50]); } catch { }
}
