import { Link } from "react-router-dom";
import SeoFaq from "@/components/SeoFaq";
import { categorySeoEntries } from "@/lib/categorySeo";
import { BookOpen, MessageCircle, Lightbulb } from "lucide-react";

const homeFaqs = [
  {
    question: "What is Skillful?",
    answer:
      "Skillful is a swipe-based quiz platform that helps users practice real-life judgment in parenting, communication, career growth, relationships, and financial literacy.",
  },
  {
    question: "How does Skillful help with real-world decision making?",
    answer:
      "Instead of passive reading, Skillful uses true or false scenarios so users can train faster judgment, pattern recognition, and practical thinking.",
  },
  {
    question: "Which topics can I practice on Skillful?",
    answer:
      "Users can practice parenting, self-worth, communication, dating, leadership, interview prep, salary negotiation, strategy, and stock market literacy.",
  },
];

const HomeSeoSections = () => {
  return (
    <>
      {/* Overview + Benefits */}
      <section className="relative z-10 mt-16 w-full max-w-5xl px-2">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-widest">
                What is Skillful
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-display font-bold text-foreground sm:text-3xl">
              Practice better real-life decisions
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
              Skillful is a mobile-friendly quiz app that turns life advice into fast
              decision practice. Users swipe through true or false scenarios to build
              better judgment in parenting, boundaries, communication, workplace
              leadership, interviews, salary negotiation, dating, and investing.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
              The format is optimized for short learning loops, making each topic
              easier to understand and retain through active practice.
            </p>
          </article>

          <aside className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <Lightbulb className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-widest">
                Why it works
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-display font-bold text-foreground sm:text-3xl">
              Answer-focused skill practice
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                Fast scenario-based learning for real-world confidence
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                Useful for personal growth and professional development
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                Built for mobile, quick sessions, and repeat practice
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                Voice-search friendly topic pages with direct answers
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* Explore Topics */}
      <section className="relative z-10 mt-16 w-full max-w-5xl px-2">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-display font-bold text-foreground sm:text-3xl">
            Explore Topics
          </h2>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categorySeoEntries.map((entry) => (
            <Link
              key={entry.id}
              to={entry.path}
              className="group rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                {entry.group}
              </p>
              <h3 className="mt-3 text-lg font-display font-bold text-foreground group-hover:text-primary transition-colors">
                {entry.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {entry.summary}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Answer */}
      <section className="relative z-10 mt-16 w-full max-w-5xl px-2">
        <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
          <div className="flex items-center gap-2 text-primary">
            <MessageCircle className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-widest">
              Quick answer
            </p>
          </div>
          <h2 className="mt-4 text-2xl font-display font-bold text-foreground sm:text-3xl">
            What is the best quiz app for real-life skills?
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
            Skillful is a strong option for real-life skills practice because it turns
            advice into short, repeatable scenarios. Instead of reading generic tips,
            users train judgment in specific topics like parenting, communication,
            leadership, interviews, salary negotiation, and financial literacy.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mt-16 w-full max-w-5xl px-2">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-display font-bold text-foreground sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <SeoFaq items={homeFaqs} />
      </section>
    </>
  );
};

export default HomeSeoSections;
