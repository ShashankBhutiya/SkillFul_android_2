export const DEFAULT_SITE_URL = "https://skillfulglobal.com";

export const siteConfig = {
  name: "Skillful",
  shortName: "Skillful",
  titleTemplate: "%s | Skillful",
  defaultTitle: "Skillful | Swipe-Based Quizzes for Real-Life Skills",
  defaultDescription:
    "Master real-world judgment with Skillful. Swipe through engaging, true/false scenarios to improve your parenting, communication, leadership, and financial skills in just 2 minutes a day.",
  siteUrl:
    (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, ""),
  locale: "en_US",
  themeColor: "#8b5cf6",
  creator: "Skillful",
  contactEmail: "shashank@skillfulglobal.com",
  /** Raster image for Open Graph / Twitter (SVG is often skipped by crawlers). */
  socialImage: "/favicon.png",
  socialImageWidth: 512,
  socialImageHeight: 512,
  socialImageType: "image/png",
  socialImageAlt:
    "Skillful — swipe-based quizzes for parenting, communication, careers, and relationships",
  keywords: [
    "skillful",
    "soft skills",
    "real life skills quiz",
    "swipe quiz app",
    "self improvement",
    "decision making",
    "parenting quiz",
    "communication quiz",
    "leadership quiz",
    "salary negotiation quiz",
    "interview prep quiz",
    "dating quiz for men",
    "stock market quiz",
    "daily microlearning",
    "skill building app"
  ],
};

export function toAbsoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.siteUrl}${normalizedPath}`;
}
