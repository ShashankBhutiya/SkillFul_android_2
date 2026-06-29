import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Target, Users, Zap, BookOpen, Brain, TrendingUp } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { MainLayout } from "@/components/layout/MainLayout";
import { buildBreadcrumbSchema, buildOrganizationSchema } from "@/seo/structuredData";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  whileInView: { transition: { staggerChildren: 0.12 } },
  viewport: { once: true },
};

const missionCards = [
  {
    icon: Target,
    title: "Practice Over Theory",
    description:
      "Real growth comes from repetition, not passive reading. Skillful turns advice into hands-on scenarios you can practice anywhere.",
  },
  {
    icon: Users,
    title: "Built for Everyone",
    description:
      "Whether you are a parent, job seeker, or professional, every topic is designed around the decisions you actually face.",
  },
  {
    icon: Zap,
    title: "Fast and Focused",
    description:
      "Short, swipeable sessions fit into any schedule. Each quiz sharpens judgment in under two minutes.",
  },
];

const steps = [
  {
    number: "01",
    title: "Pick a Topic",
    description:
      "Choose from categories like communication, parenting, negotiation, interview prep, and financial literacy.",
    icon: BookOpen,
  },
  {
    number: "02",
    title: "Swipe Through Scenarios",
    description:
      "Each card presents a real-world statement. Swipe right for true, left for false, and build pattern recognition.",
    icon: Brain,
  },
  {
    number: "03",
    title: "Sharpen Your Judgment",
    description:
      "Instant feedback and spaced repetition help you internalize better decision-making over time.",
    icon: TrendingUp,
  },
];

const AboutPage = () => {
  return (
    <MainLayout>
      <SeoHead
        title="About Skillful"
        description="Learn about Skillful, the swipe-based quiz platform designed to help people practice better real-life judgment."
        path="/about"
        keywords={["about skillful", "real life skills quiz app", "scenario based learning platform"]}
        structuredData={[
          buildOrganizationSchema(),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
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
            <span className="text-foreground">About</span>
          </nav>
          <motion.div {...fadeUp} className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              About Skillful
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Skillful is built around one idea: advice becomes more useful when people can practice it.
              Instead of consuming passive content, users swipe through true-or-false scenarios to sharpen
              judgment in the areas that matter most.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Our Mission
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
              Learning That Sticks
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              We believe the best way to learn life skills is through practice, not lectures. Here is what drives us.
            </p>
          </motion.div>

          <motion.div
            {...staggerContainer}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {missionCards.map((card) => (
              <motion.div
                key={card.title}
                {...fadeUp}
                className="group rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-foreground">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted/30 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              How It Works
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
              Three Simple Steps
            </h2>
          </motion.div>

          <motion.div
            {...staggerContainer}
            className="mt-14 grid gap-8 md:grid-cols-3"
          >
            {steps.map((step, idx) => (
              <motion.div
                key={step.number}
                {...fadeUp}
                className="relative rounded-2xl border border-border/50 bg-card p-8 shadow-sm"
              >
                <span className="font-display text-5xl font-bold text-primary/15">
                  {step.number}
                </span>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                {idx < steps.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden h-0.5 w-8 bg-border md:block" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Built for Real Life Section */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm"
          >
            <div className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-12 lg:p-16">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                  Our Approach
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
                  Built for Real Life
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  The platform is designed for fast repetition, mobile use, and high-intent discovery.
                  Each topic works as both a helpful learning experience and a structured answer surface
                  for search engines and AI retrieval systems.
                </p>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Skillful covers parenting, communication, relationships, workplace growth, interviews,
                  negotiation, and financial literacy, because these are the areas where better judgment
                  changes outcomes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Topics", value: "7+" },
                  { label: "Scenarios", value: "100+" },
                  { label: "Sessions", value: "~2 min" },
                  { label: "Cost", value: "Free" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-border/50 bg-background p-5 text-center"
                  >
                    <p className="font-display text-2xl font-bold text-primary">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
};

export default AboutPage;
