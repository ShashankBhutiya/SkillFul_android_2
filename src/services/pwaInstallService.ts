// PWA Install Service to capture beforeinstallprompt and manage custom install alerts
// Helps unregistered/guest users receive native device reminders by adding to home screen

let deferredPrompt: any = null;
let isInstallable = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    isInstallable = true;
    window.dispatchEvent(new Event("skillful_pwa_installable"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    isInstallable = false;
    localStorage.setItem("skillful_pwa_installed", "true");
    window.dispatchEvent(new Event("skillful_pwa_installed_event"));
    console.log("Skillful PWA was installed successfully!");
  });
}

export function getIsInstallable(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check if running in standalone mode (already installed/PWA)
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
    || (window.navigator as any).standalone 
    || localStorage.getItem("skillful_pwa_installed") === "true";
    
  if (isStandalone) return false;
  return isInstallable;
}

export function getIsIOSInstallable(): boolean {
  if (typeof window === "undefined") return false;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
    || (window.navigator as any).standalone;
    
  return isIOS && !isStandalone;
}

export async function triggerPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn("PWA install prompt is not deferred yet.");
    return false;
  }
  
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear deferredPrompt
    deferredPrompt = null;
    isInstallable = false;
    window.dispatchEvent(new Event("skillful_pwa_installable")); // update UI
    
    return outcome === "accepted";
  } catch (e) {
    console.error("Failed to trigger PWA install prompt:", e);
    return false;
  }
}
