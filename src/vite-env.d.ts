/// <reference types="vite/client" />

interface Window {
  trackingFunctions?: {
    onLoad?: (options: { appId: string }) => void;
  };
  requestIdleCallback?: (callback: IdleRequestCallback) => number;
}
