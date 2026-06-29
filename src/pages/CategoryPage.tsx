import { Link, useParams } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import SeoFaq from "@/components/SeoFaq";
import { categories } from "@/data/questions";
import { getCategorySeoBySlug } from "@/lib/categorySeo";
import { buildCategorySchemas } from "@/seo/structuredData";
import NotFound from "./NotFound";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const seoEntry = getCategorySeoBySlug(slug);

  if (!seoEntry) {
    return <NotFound />;
  }

  const category = categories.find((entry) => entry.id === seoEntry.id);

  if (!category) {
    return <NotFound />;
  }
  const sampleQuestions = category.questions.slice(0, 6);
  const relatedKeywords = [
    seoEntry.primaryKeyword,
    ...seoEntry.secondaryKeywords,
    `${seoEntry.name.toLowerCase()} practice questions`,
  ];

  return (
    <>
      <SeoHead
        title={`${seoEntry.name} Quiz and Practice Questions`}
        description={seoEntry.summary}
        path={seoEntry.path}
        keywords={relatedKeywords}
        image={seoEntry.coverImage || "/favicon.png"}
        type="article"
        structuredData={buildCategorySchemas(seoEntry)}
      />

      <main className="min-h-screen bg-background px-4 py-8">
        <article className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/categories" className="hover:text-primary">
              Categories
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{seoEntry.name}</span>
          </nav>

          <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-card/70 shadow-xl">
            <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="p-8 md:p-10">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
                  {seoEntry.group} Skill Track
                </p>
                <h1 className="max-w-3xl text-4xl font-display font-bold tracking-tight text-foreground md:text-5xl">
                  {seoEntry.name} Quiz
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                  {seoEntry.intro}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to={`/skills/${seoEntry.id}`}
                    className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
                  >
                    Start {seoEntry.name} Quiz
                  </Link>
                  <Link
                    to="/categories"
                    className="rounded-full border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-bold text-primary"
                  >
                    Explore More Categories
                  </Link>
                </div>
                <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-background/60 p-4">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Question Bank
                    </dt>
                    <dd className="mt-2 text-2xl font-bold text-foreground">
                      {seoEntry.questionCount}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-background/60 p-4">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Format
                    </dt>
                    <dd className="mt-2 text-2xl font-bold text-foreground">
                      Swipe Quiz
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-background/60 p-4">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Best For
                    </dt>
                    <dd className="mt-2 text-lg font-bold text-foreground">
                      Fast Judgment Practice
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="relative min-h-[280px]">
                <img
                  src={seoEntry.coverImage || "/favicon.png"}
                  alt={`${seoEntry.name} quiz cover`}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              </div>
            </div>
          </header>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-card/60 p-8">
              <h2 className="text-2xl font-display font-bold text-foreground">
                AI-Readable Summary
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                {seoEntry.featuredSnippet}
              </p>
              <h2 className="mt-8 text-2xl font-display font-bold text-foreground">
                Why this page ranks for answer engines
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <li>This page uses direct question-and-answer formatting that works well for voice search and AI summaries.</li>
                <li>The content is organized around one intent cluster: {seoEntry.primaryKeyword}.</li>
                <li>Semantic supporting terms help search engines understand the topic without keyword stuffing.</li>
              </ul>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-card/60 p-8">
              <h2 className="text-2xl font-display font-bold text-foreground">
                Related Search Topics
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {relatedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </aside>
          </section>

          <section className="mt-10 rounded-[2rem] border border-white/10 bg-card/60 p-8">
            <h2 className="text-2xl font-display font-bold text-foreground">
              Sample {seoEntry.name} Questions
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sampleQuestions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-2xl border border-white/10 bg-background/70 p-5"
                >
                  <p className="text-base font-semibold text-foreground">
                    {question.statement}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Correct answer: {question.answer ? "True" : "False"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {question.explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-[2rem] border border-white/10 bg-card/60 p-8">
            <h2 className="text-2xl font-display font-bold text-foreground">
              Frequently Asked Questions
            </h2>
            <div className="mt-6">
              <SeoFaq items={seoEntry.faqs} />
            </div>
          </section>
        </article>
      </main>
    </>
  );
};

export default CategoryPage;
