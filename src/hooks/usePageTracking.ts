import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Custom hook that tracks page views on location updates.
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    if (!GA_ID || GA_ID === "G-XXXXXXXXXX") return;

    // Send the pageview to GA4.
    // If user has opt-ed out, GA4 Consent Mode handles redacting tracking identifiers automatically.
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search,
      title: document.title,
    });
  }, [location]);
};
export default usePageTracking;
