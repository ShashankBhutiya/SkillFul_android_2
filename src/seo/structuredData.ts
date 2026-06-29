import type { CategorySeoEntry } from "@/lib/categorySeo";
import { siteConfig, toAbsoluteUrl } from "@/seo/siteConfig";

export interface SeoPayload {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  structuredData?: Record<string, unknown>[];
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    logo: toAbsoluteUrl("/favicon.png"),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: siteConfig.contactEmail,
        availableLanguage: ["English"],
      },
    ],
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    inLanguage: "en",
    description: siteConfig.defaultDescription,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
  };
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; path: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
  };
}

export function buildFaqSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildHomeSchemas() {
  return [
    buildOrganizationSchema(),
    buildWebsiteSchema(),
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: siteConfig.siteUrl,
      description: siteConfig.defaultDescription,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ];
}

export function buildCategorySchemas(category: CategorySeoEntry) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${category.name} Quiz`,
      description: category.summary,
      author: {
        "@type": "Organization",
        name: siteConfig.name,
      },
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        logo: {
          "@type": "ImageObject",
          url: toAbsoluteUrl("/favicon.png"),
        },
      },
      mainEntityOfPage: toAbsoluteUrl(category.path),
      keywords: [category.primaryKeyword, ...category.secondaryKeywords].join(", "),
      articleSection: category.group,
      image: toAbsoluteUrl(siteConfig.socialImage),
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${category.name} Quiz`,
      description: category.summary,
      url: toAbsoluteUrl(category.path),
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.siteUrl,
      },
      about: {
        "@type": "Thing",
        name: category.name,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${category.name} question collection`,
      numberOfItems: category.questionCount,
      url: toAbsoluteUrl(category.path),
    },
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Categories", path: "/categories" },
      { name: category.name, path: category.path },
    ]),
    buildFaqSchema(category.faqs),
  ];
}

export function buildBlogSchemas(post: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt: string;
  keywords: string[];
  faqs: Array<{ question: string; answer: string }>;
}) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      mainEntityOfPage: toAbsoluteUrl(post.path),
      author: {
        "@type": "Organization",
        name: siteConfig.name,
      },
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        logo: {
          "@type": "ImageObject",
          url: toAbsoluteUrl("/favicon.png"),
        },
      },
      image: toAbsoluteUrl(siteConfig.socialImage),
      keywords: post.keywords.join(", "),
      inLanguage: "en",
    },
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: post.path },
    ]),
    buildFaqSchema(post.faqs),
  ];
}
