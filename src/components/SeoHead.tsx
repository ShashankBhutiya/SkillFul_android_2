import { useEffect } from "react";
import { siteConfig, toAbsoluteUrl } from "@/seo/siteConfig";
import type { SeoPayload } from "@/seo/structuredData";

const MANAGED_ATTR = "data-seo-managed";

function upsertMeta(
  selector: string,
  attributes: Record<string, string>,
  content: string
) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(MANAGED_ATTR, "true");
    Object.entries(attributes).forEach(([key, value]) =>
      element?.setAttribute(key, value)
    );
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) =>
    element?.setAttribute(key, value)
  );
  element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector(
    `link[rel="${rel}"]`
  ) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }

  element.setAttribute(MANAGED_ATTR, "true");
  element.href = href;
}

export function SeoHead({
  title,
  description,
  path,
  keywords = [],
  image,
  type = "website",
  noindex = false,
  structuredData = [],
}: SeoPayload) {
  useEffect(() => {
    const canonicalUrl = toAbsoluteUrl(path);
    const suffix = ` | ${siteConfig.name}`;
    const fullTitle =
      title === siteConfig.defaultTitle || title.endsWith(suffix)
        ? title
        : siteConfig.titleTemplate.replace("%s", title);
    const socialImage = toAbsoluteUrl(image || siteConfig.socialImage);
    const defaultSocialImage = toAbsoluteUrl(siteConfig.socialImage);
    const useDefaultSocialMeta = socialImage === defaultSocialImage;

    document.documentElement.lang = "en";
    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: "description" }, description);
    upsertMeta(
      'meta[name="keywords"]',
      { name: "keywords" },
      [...siteConfig.keywords, ...keywords].join(", ")
    );
    upsertMeta(
      'meta[name="robots"]',
      { name: "robots" },
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"
    );
    upsertMeta(
      'meta[name="author"]',
      { name: "author" },
      siteConfig.creator
    );
    upsertMeta(
      'meta[name="twitter:card"]',
      { name: "twitter:card" },
      "summary_large_image"
    );
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, fullTitle);
    upsertMeta(
      'meta[name="twitter:description"]',
      { name: "twitter:description" },
      description
    );
    upsertMeta(
      'meta[name="twitter:image"]',
      { name: "twitter:image" },
      socialImage
    );
    upsertMeta('meta[property="og:type"]', { property: "og:type" }, type);
    upsertMeta(
      'meta[property="og:site_name"]',
      { property: "og:site_name" },
      siteConfig.name
    );
    upsertMeta(
      'meta[property="og:title"]',
      { property: "og:title" },
      fullTitle
    );
    upsertMeta(
      'meta[property="og:description"]',
      { property: "og:description" },
      description
    );
    upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    upsertMeta(
      'meta[property="og:image"]',
      { property: "og:image" },
      socialImage
    );

    if (useDefaultSocialMeta) {
      upsertMeta(
        'meta[property="og:image:width"]',
        { property: "og:image:width" },
        String(siteConfig.socialImageWidth)
      );
      upsertMeta(
        'meta[property="og:image:height"]',
        { property: "og:image:height" },
        String(siteConfig.socialImageHeight)
      );
      upsertMeta(
        'meta[property="og:image:type"]',
        { property: "og:image:type" },
        siteConfig.socialImageType
      );
      upsertMeta(
        'meta[property="og:image:alt"]',
        { property: "og:image:alt" },
        siteConfig.socialImageAlt
      );
    } else {
      ["og:image:width", "og:image:height", "og:image:type", "og:image:alt"].forEach(
        (prop) => {
          document.head
            .querySelectorAll(`meta[property="${prop}"]`)
            .forEach((node) => node.remove());
        }
      );
    }
    upsertMeta(
      'meta[property="og:locale"]',
      { property: "og:locale" },
      siteConfig.locale
    );

    upsertLink("canonical", canonicalUrl);

    document.head
      .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
      .forEach((node) => node.remove());

    structuredData.forEach((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(MANAGED_ATTR, "true");
      script.textContent = JSON.stringify(entry);
      document.head.appendChild(script);
    });
  }, [description, image, keywords, noindex, path, structuredData, title, type]);

  return null;
}
