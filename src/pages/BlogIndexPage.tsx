import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { MainLayout } from "@/components/layout/MainLayout";
import { blogEntries } from "@/lib/blog";
import { buildBreadcrumbSchema } from "@/seo/structuredData";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

/** Estimate read time from sections */
function estimateReadTime(post: (typeof blogEntries)[number]): string {
  const wordCount =
    (post.description?.split(" ").length || 0) +
    (post.sections?.reduce(
      (sum, s) => sum + (s.body?.split(" ").length || 0) + (s.heading?.split(" ").length || 0),
      0
    ) || 0);
  const minutes = Math.max(2, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

/** Format date string for display */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const BlogIndexPage = () => {
  const featured = blogEntries[0];
  const remaining = blogEntries.slice(1);

  return (
    <MainLayout>
      <SeoHead
        title="Skillful Blog"
        description="Read Skillful articles on communication, interview prep, salary negotiation, parenting, and financial literacy."
        path="/blog"
        keywords={["skillful blog", "communication articles", "interview prep articles", "salary negotiation articles"]}
        structuredData={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Blog</span>
          </nav>
          <motion.div {...fadeUp} className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Skillful Blog
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Practical guides and in-depth articles on communication, interviews, negotiation, parenting, and financial literacy.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Content */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Featured Post */}
          {featured && (
            <motion.div {...fadeUp}>
              <Link
                to={featured.path}
                className="group block overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="p-8 md:p-10 lg:p-12">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                      Featured
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {featured.category}
                    </span>
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-bold text-foreground transition-colors group-hover:text-primary sm:text-3xl lg:text-4xl">
                    {featured.title}
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
                    {featured.description}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(featured.publishedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{estimateReadTime(featured)}</span>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Read Article <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Remaining Posts Grid */}
          {remaining.length > 0 && (
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {remaining.map((post, idx) => (
                <motion.div
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                >
                  <Link
                    to={post.path}
                    className="group flex h-full flex-col rounded-2xl border border-border/50 bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                        {post.category}
                      </span>
                    </div>
                    <h2 className="mt-4 font-display text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                    </h2>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {post.description}
                    </p>
                    <div className="mt-5 flex items-center gap-4 border-t border-border/30 pt-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{estimateReadTime(post)}</span>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default BlogIndexPage;
