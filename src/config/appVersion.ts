import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export const FALLBACK_VERSION = "1.1.0";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.truthswipe.app";

export async function getAppVersion(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const info = await App.getInfo();
    return info.version;
  }
  return FALLBACK_VERSION;
}

export function compareVersions(current: string, minimum: string): number {
  const a = current.split(".").map(Number);
  const b = minimum.split(".").map(Number);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
