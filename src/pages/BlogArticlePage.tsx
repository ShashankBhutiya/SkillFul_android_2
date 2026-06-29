import { Link, useParams } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import SeoFaq from "@/components/SeoFaq";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildBlogSchemas } from "@/seo/structuredData";
import NotFound from "./NotFound";

const BlogArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return <NotFound />;
  }

  return (
    <>
      <SeoHead
        title={post.title}
        description={post.description}
        path={post.path}
        keywords={post.keywords}
        type="article"
        structuredData={buildBlogSchemas(post)}
      />
      <main className="min-h-screen bg-background px-4 py-8">
        <article className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-card/60 p-8 md:p-10">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/blog" className="hover:text-primary">Blog</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{post.title}</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">{post.category}</p>
          <h1 className="mt-3 text-4xl font-display font-bold text-foreground md:text-5xl">{post.title}</h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">{post.summary}</p>
          <div className="mt-8 space-y-8">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-display font-bold text-foreground">{section.heading}</h2>
                <p className="mt-3 text-base leading-8 text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>
          <section className="mt-10">
            <h2 className="text-2xl font-display font-bold text-foreground">Frequently Asked Questions</h2>
            <div className="mt-5">
              <SeoFaq items={post.faqs} />
            </div>
          </section>
        </article>
      </main>
    </>
  );
};

export default BlogArticlePage;
