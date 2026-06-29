const SOUND_KEY = "quiz_sounds_enabled";

export function getSoundsEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_KEY, String(enabled));
}

const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  if (!getSoundsEnabled()) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {}
}

export function playCorrect() {
  playTone(523, 0.12, "sine", 0.12);
  setTimeout(() => playTone(659, 0.12, "sine", 0.12), 80);
  setTimeout(() => playTone(784, 0.18, "sine", 0.15), 160);
}

export function playWrong() {
  playTone(200, 0.25, "sawtooth", 0.08);
  setTimeout(() => playTone(160, 0.3, "sawtooth", 0.06), 120);
}

export function playCombo() {
  playTone(600, 0.08, "sine", 0.1);
  setTimeout(() => playTone(800, 0.08, "sine", 0.1), 60);
  setTimeout(() => playTone(1000, 0.08, "sine", 0.12), 120);
  setTimeout(() => playTone(1200, 0.15, "sine", 0.15), 180);
}

export function playTick() {
  playTone(880, 0.05, "square", 0.04);
}

export function playTimeUp() {
  playTone(400, 0.15, "sawtooth", 0.1);
  setTimeout(() => playTone(300, 0.15, "sawtooth", 0.1), 150);
  setTimeout(() => playTone(200, 0.3, "sawtooth", 0.12), 300);
}

export function playSwipe() {
  playTone(440, 0.06, "sine", 0.05);
}
