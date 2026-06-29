import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const apolloAppId = import.meta.env.VITE_APOLLO_APP_ID;

if (apolloAppId) {
  const loadTracker = () => {
    const script = document.createElement("script");
    script.src = `https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=${Math.random()
      .toString(36)
      .slice(2)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.trackingFunctions?.onLoad?.({ appId: apolloAppId });
    };
    document.head.appendChild(script);
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadTracker);
  } else {
    window.setTimeout(loadTracker, 1500);
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for offline and notification click handling
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("Service Worker registered with scope:", reg.scope);
      })
      .catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
  });
}

