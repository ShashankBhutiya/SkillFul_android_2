import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Heart, TrendingUp, Zap, Layers, BookOpen, Sparkles, Users } from "lucide-react";
import HeroShowcase from "@/components/home/HeroShowcase";
import HomeSeoSections from "@/components/HomeSeoSections";
import { MainLayout } from "@/components/layout/MainLayout";
import categorySummaries from "@/data/categorySummaries.json";
import { categories as questionCategories } from "@/data/questions";

const TOTAL_CATEGORIES = categorySummaries.length;
const TOTAL_QUESTIONS = questionCategories.reduce((sum, c) => sum + c.questions.length, 0);

const MARQUEE_TOPICS = [
  "Interview Prep",
  "Salary Negotiation",
  "Parenting",
  "Communication",
  "Leadership",
  "Dating",
  "Investing",
  "Boundaries",
  "Corporate Strategy",
  "Self-Worth",
];

const ease = [0.16, 1, 0.3, 1] as const;

const Index = () => {
  const skillOfTheDay = categorySummaries.length > 0
    ? categorySummaries[(new Date().getDate() + new Date().getMonth() * 31) % categorySummaries.length]
    : null;

  return (
    <MainLayout>
      {/* ─── Hero ─── */}
      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
        {/* Dot grid background */}
        <div className="absolute inset-0 -z-10 bg-dot-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" aria-hidden />

        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 xl:gap-20">
          {/* Copy */}
          <div className="text-center lg:text-left relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-xs font-semibold tracking-wide text-foreground/80">
                The smartest way to learn
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5, ease }}
              className="mt-7 font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem]"
            >
              Train your judgment
              <br className="hidden lg:block" />
              <span className="text-gradient"> before life asks.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.5, ease }}
              className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0"
            >
              Master career, relationships, and finance through {TOTAL_QUESTIONS.toLocaleString()}+ rapid-fire
              scenarios. Two minutes a day builds instincts that last a lifetime.
            </motion.p>

            {/* Skill of the Day Callout */}
            {skillOfTheDay && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.5, ease }}
                className="mx-auto lg:mx-0 mt-8 max-w-md rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${skillOfTheDay.gradient} text-xl shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                      {skillOfTheDay.emoji}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Skill of the Day</span>
                        <span className="inline-block h-1 w-1 rounded-full bg-primary/40" />
                        <span className="text-[10px] font-medium text-muted-foreground">{skillOfTheDay.questionCount} Scenarios</span>
                      </div>
                      <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{skillOfTheDay.name}</h4>
                    </div>
                  </div>
                  <Link
                    to={`/skills/${skillOfTheDay.id}`}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 text-xs font-bold text-primary transition-all active:scale-95"
                  >
                    Practice
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* CTA + secondary */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease }}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            >
              <Link
                to="/skills"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-bold text-background shadow-lg shadow-foreground/10 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
              >
                Start practicing free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/about"
                className="inline-flex w-full items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                How it works
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-8 lg:justify-start lg:gap-10"
            >
              {[
                { value: `${TOTAL_CATEGORIES}+`, label: "Skill topics", icon: Layers },
                { value: `${(TOTAL_QUESTIONS / 1000).toFixed(1)}k`, label: "Scenarios", icon: BookOpen },
                { value: "2 min", label: "Per session", icon: Zap },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2.5">
                  <stat.icon className="h-4 w-4 text-primary/70" />
                  <div>
                    <span className="font-display text-lg font-bold text-foreground">{stat.value}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Product showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease }}
            className="relative flex justify-center lg:justify-end"
          >
            <HeroShowcase />
          </motion.div>
        </div>
      </section>

      {/* ─── Social proof ─── */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-muted/30 px-6 py-8 text-center sm:flex-row sm:justify-center sm:gap-8 sm:text-left"
        >
          <div className="flex -space-x-2">
            {["bg-primary", "bg-accent", "bg-blue-500", "bg-emerald-500"].map((bg, i) => (
              <div
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-full ${bg} border-2 border-background text-xs font-bold text-white`}
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Trusted by thousands of learners</p>
            <p className="text-xs text-muted-foreground mt-0.5">Join the community practicing real-life decisions daily</p>
          </div>
        </motion.div>
      </section>

      {/* ─── Topic marquee ─── */}
      <section className="relative overflow-hidden border-y border-border/40 bg-muted/20 py-4">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent sm:w-28"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent sm:w-28"
          aria-hidden
        />
        <div className="flex whitespace-nowrap">
          <div className="marquee-track flex gap-3 pr-3">
            {[...MARQUEE_TOPICS, ...MARQUEE_TOPICS].map((topic, i) => (
              <span
                key={`${topic}-${i}`}
                className="inline-flex items-center rounded-full border border-border/50 bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground"
              >
                <Sparkles className="mr-1.5 h-3 w-3 text-primary/50" />
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Value props — bento grid ─── */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Why Skillful</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
            Not another course. A practice gym for real life.
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
          {/* Career — large card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 sm:col-span-2 lg:col-span-7 lg:p-10 transition-all hover:shadow-lg"
          >
            <Briefcase className="h-9 w-9 text-blue-500" />
            <h3 className="mt-5 font-display text-2xl font-bold text-foreground">Career & leadership</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Interview traps, salary framing, office politics — rehearsed as bite-sized scenarios
              so you respond with clarity under pressure.
            </p>
          </motion.div>

          {/* Relationships */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="group rounded-2xl border border-border/50 bg-card p-8 lg:col-span-5 transition-all hover:shadow-lg"
          >
            <Heart className="h-9 w-9 text-rose-500" />
            <h3 className="mt-5 font-display text-xl font-bold text-foreground">Relationships</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Boundaries, communication, dating — build instinct, not theory.
            </p>
          </motion.div>

          {/* Money */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group rounded-2xl border border-border/50 bg-card p-8 sm:col-span-2 lg:col-span-5 transition-all hover:shadow-lg"
          >
            <TrendingUp className="h-9 w-9 text-emerald-500" />
            <h3 className="mt-5 font-display text-xl font-bold text-foreground">Money & investing</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Spot bad advice, think long-term, and avoid costly myths.
            </p>
          </motion.div>

          {/* Swipe mechanic — inverted dark card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.14 }}
            className="relative flex flex-col justify-center overflow-hidden rounded-2xl bg-foreground p-8 sm:col-span-2 lg:col-span-7 lg:p-10 transition-all hover:shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3.5 py-1.5 text-xs font-bold text-background">
                False
              </span>
              <span className="text-sm font-medium text-background/60">Swipe the card</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3.5 py-1.5 text-xs font-bold text-background">
                True
              </span>
            </div>
            <p className="mt-5 font-display text-2xl font-bold text-background tracking-tight">
              Instant feedback. Zero fluff.
              <br className="hidden sm:block" /> Progress you can feel.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Bottom CTA banner ─── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-border/50 px-8 py-14 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Ready to sharpen your instincts?
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Pick any skill, start swiping, and feel the difference in how you think about everyday decisions.
          </p>
          <Link
            to="/skills"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-base font-bold text-background shadow-lg shadow-foreground/10 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Pick a Skill & Start Practicing
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ─── SEO content ─── */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <HomeSeoSections />
      </div>
    </MainLayout>
  );
};

export default Index;
