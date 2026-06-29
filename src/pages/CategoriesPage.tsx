import { Link } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import { categorySeoEntries } from "@/lib/categorySeo";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildWebsiteSchema,
} from "@/seo/structuredData";

const pageFaqs = [
  {
    question: "What kinds of categories does Skillful cover?",
    answer:
      "Skillful covers personal and professional growth topics like parenting, communication, dating, leadership, salary negotiation, interview prep, and investing awareness.",
  },
  {
    question: "Why do category pages help SEO and AI search?",
    answer:
      "Each category page gives search engines a focused topic, stronger internal linking, clearer metadata, and better question-answer formatting for answer engines.",
  },
];

const CategoriesPage = () => {
  return (
    <>
      <SeoHead
        title="Quiz Categories for Real-Life Skills"
        description="Browse Skillful quiz categories for parenting, communication, leadership, dating, salary negotiation, stock market learning, and more."
        path="/categories"
        keywords={[
          "quiz categories",
          "real life skills topics",
          "professional growth quiz",
          "personal growth quiz",
        ]}
        structuredData={[
          buildOrganizationSchema(),
          buildWebsiteSchema(),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Categories", path: "/categories" },
          ]),
          buildFaqSchema(pageFaqs),
        ]}
      />

      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Categories</span>
          </nav>

          <header className="rounded-[2rem] border border-white/10 bg-card/60 p-8 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
              Programmatic SEO Hub
            </p>
            <h1 className="mt-4 text-4xl font-display font-bold tracking-tight text-foreground md:text-5xl">
              Browse all Skillful quiz categories
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              These indexable category pages help users and search engines discover
              focused quiz experiences for real-world skills, communication, relationships,
              career growth, and financial literacy.
            </p>
          </header>

          <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categorySeoEntries.map((entry) => (
              <Link
                key={entry.id}
                to={entry.path}
                className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-card/60 shadow-lg transition-transform hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={entry.coverImage || "/favicon.png"}
                    alt={`${entry.name} category preview`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                      {entry.group}
                    </p>
                    <h2 className="mt-2 text-2xl font-display font-bold text-white">
                      {entry.name}
                    </h2>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {entry.summary}
                  </p>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </>
  );
};

export default CategoriesPage;
