import categoryCatalog from "@/seo/categoryCatalog.json";
import categorySummaries from "@/data/categorySummaries.json";
import { categories as questionCategories } from "@/data/questions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CategorySeoEntry = {
  id: string;
  slug: string;
  name: string;
  group: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  summary: string;
  intro: string;
  featuredSnippet: string;
  faqs: Array<{ question: string; answer: string }>;
  questionCount: number;
  categoryType: string;
  path: string;
  emoji: string;
  gradient: string;
  coverImage?: string;
};

const catalogMap = new Map(categoryCatalog.map((entry) => [entry.id, entry]));

// Build lookup for real-time question counts from actual data
const questionCountMap = new Map(
  questionCategories.map((c) => [c.id, c.questions.length])
);

export const categorySeoEntries: CategorySeoEntry[] = categorySummaries.map(
  (summary) => {
    const custom = catalogMap.get(summary.id);
    const displayName = summary.name.replace(/\s+\(.*?\)\s*$/g, "");
    const slug = custom?.slug || `${slugify(displayName)}-quiz`;
    const primaryKeyword =
      custom?.primaryKeyword || `${displayName.toLowerCase()} quiz`;

    return {
      id: summary.id,
      slug,
      name: summary.name,
      group: summary.type,
      primaryKeyword,
      secondaryKeywords:
        custom?.secondaryKeywords || [
          `${displayName.toLowerCase()} practice questions`,
          `${displayName.toLowerCase()} scenarios`,
          `true false ${displayName.toLowerCase()} quiz`,
        ],
      summary:
        custom?.summary ||
        `Practice ${displayName.toLowerCase()} judgment with swipe-based true or false scenarios on Skillful.`,
      intro:
        custom?.intro ||
        `Skillful helps users build faster judgment in ${displayName.toLowerCase()} through quick scenario-based practice.`,
      featuredSnippet:
        custom?.featuredSnippet ||
        `A ${displayName.toLowerCase()} quiz helps users build sharper judgment through realistic, swipe-based scenarios and instant answer feedback.`,
      faqs:
        custom?.faqs || [
          {
            question: `What does the ${displayName} quiz include?`,
            answer: `It includes swipe-based true or false scenarios designed to improve practical judgment in ${displayName.toLowerCase()}.`,
          },
          {
            question: `Who should use the ${displayName} quiz?`,
            answer: `It is useful for anyone who wants faster pattern recognition, stronger decision making, and more confidence in ${displayName.toLowerCase()}.`,
          },
        ],
      questionCount: questionCountMap.get(summary.id) ?? summary.questionCount,
      categoryType: summary.type,
      path: `/categories/${slug}`,
      emoji: summary.emoji,
      gradient: summary.gradient,
      coverImage: summary.coverImage,
    };
  }
);

export function getCategorySeoBySlug(slug?: string) {
  return categorySeoEntries.find((entry) => entry.slug === slug);
}

export function getCategorySeoById(id?: string) {
  return categorySeoEntries.find((entry) => entry.id === id);
}
