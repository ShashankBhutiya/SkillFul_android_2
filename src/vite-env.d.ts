/// <reference types="vite/client" />

// Chromium notification support used by the existing web/Android reminder services.
interface NotificationOptions {
  renotify?: boolean;
}

interface Window {
  trackingFunctions?: {
    onLoad?: (options: { appId: string }) => void;
  };
  requestIdleCallback?: (callback: IdleRequestCallback) => number;
}
