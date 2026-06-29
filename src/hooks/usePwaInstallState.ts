import { useState, useEffect } from "react";
import { getIsInstallable, getIsIOSInstallable } from "@/services/pwaInstallService";

export function usePwaInstallState() {
  const [states, setStates] = useState({
    isInstallable: getIsInstallable(),
    isIOSInstallable: getIsIOSInstallable(),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleUpdate = () => {
      setStates({
        isInstallable: getIsInstallable(),
        isIOSInstallable: getIsIOSInstallable(),
      });
    };
    
    window.addEventListener("skillful_pwa_installable", handleUpdate);
    window.addEventListener("skillful_pwa_installed_event", handleUpdate);
    
    // Listen for changes to display-mode media query
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = () => {
      handleUpdate();
    };
    mediaQuery.addEventListener("change", handleMediaChange);
    
    return () => {
      window.removeEventListener("skillful_pwa_installable", handleUpdate);
      window.removeEventListener("skillful_pwa_installed_event", handleUpdate);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  return states;
}
export default usePwaInstallState;
