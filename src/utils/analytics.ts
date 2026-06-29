import ReactGA from "react-ga4";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const getGtag = (): (...args: any[]) => void => {
  if (typeof window !== "undefined") {
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
      };
    }
    return window.gtag;
  }
  return () => {};
};

/**
 * Initializes Google Analytics 4 with default Google Consent Mode settings
 */
export const initGA = () => {
  if (!GA_ID || GA_ID === "G-XXXXXXXXXX") {
    console.warn("Google Analytics ID is not set or is using a placeholder.");
    return;
  }

  const gtag = getGtag();

  // Set default Consent Mode based on previous choices, otherwise default to denied
  const storedConsent = localStorage.getItem("cookie_consent_choice");
  const consentGranted = storedConsent === "accepted";

  gtag("consent", "default", {
    ad_storage: consentGranted ? "granted" : "denied",
    analytics_storage: consentGranted ? "granted" : "denied",
    ad_user_data: consentGranted ? "granted" : "denied",
    ad_personalization: consentGranted ? "granted" : "denied",
    wait_for_update: 500,
  });

  try {
    ReactGA.initialize(GA_ID, {
      gtagOptions: {
        send_page_view: false, // Managed manually on route change
      },
    });
    console.log("GA4 Initialized. Default consent:", consentGranted ? "granted" : "denied");
  } catch (error) {
    console.error("Failed to initialize GA4:", error);
  }
};

/**
 * Updates Google Consent Mode dynamically when the user makes a choice in the cookie banner
 */
export const updateGAConsent = (granted: boolean) => {
  const gtag = getGtag();
  const consentStatus = granted ? "granted" : "denied";

  gtag("consent", "update", {
    ad_storage: consentStatus,
    analytics_storage: consentStatus,
    ad_user_data: consentStatus,
    ad_personalization: consentStatus,
  });

  console.log(`GA4 Consent updated: ${consentStatus}`);

  // If newly granted, immediately send the initial landing pageview since the pageview
  // sent on mount was blocked or anonymized.
  if (granted && typeof window !== "undefined") {
    try {
      ReactGA.send({
        hitType: "pageview",
        page: window.location.pathname + window.location.search,
        title: document.title,
      });
    } catch (e) {
      console.warn("Failed to send initial pageview after consent update:", e);
    }
  }
};

/**
 * Track custom user swipe gameplay interaction
 */
export const trackSwipe = (
  direction: "left" | "right",
  questionId: number,
  categoryId: string,
  isCorrect: boolean
) => {
  if (!GA_ID || GA_ID === "G-XXXXXXXXXX") return;

  ReactGA.event({
    category: "Quiz Gameplay",
    action: direction === "right" ? "swipe_right" : "swipe_left",
    label: `Question #${questionId} - ${categoryId} (Correct: ${isCorrect})`,
    value: isCorrect ? 1 : 0,
  });
};

/**
 * Track quiz completion event
 */
export const trackQuizComplete = (
  categoryId: string,
  score: number,
  accuracyPct: number
) => {
  if (!GA_ID || GA_ID === "G-XXXXXXXXXX") return;

  ReactGA.event({
    category: "Quiz Gameplay",
    action: "quiz_completed",
    label: `Category: ${categoryId}`,
    value: score,
  });

  ReactGA.event({
    category: "Quiz Stats",
    action: "accuracy_percentage",
    label: `Category: ${categoryId}`,
    value: accuracyPct,
  });
};

/**
 * Track when a guest user is blocked by the login gate
 */
export const trackLoginGate = (milestoneCount: number) => {
  if (!GA_ID || GA_ID === "G-XXXXXXXXXX") return;

  ReactGA.event({
    category: "Authentication Gate",
    action: "login_gate_shown",
    value: milestoneCount,
  });
};

/**
 * Track signups, logins, and guest conversion
 */
export const trackAuthEvent = (action: "login" | "signup" | "logout", method: string) => {
  if (!GA_ID || GA_ID === "G-XXXXXXXXXX") return;

  ReactGA.event({
    category: "User Authentication",
    action: action,
    label: `Method: ${method}`,
  });
};
