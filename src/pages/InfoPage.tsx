import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Compass,
  ExternalLink,
  FileText,
  Gift,
  Flame,
  HelpCircle,
  Info,
  Mail,
  MessageSquare,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { MainLayout } from "@/components/layout/MainLayout";
import FloatingOrbs from "@/components/FloatingOrbs";
import { buildBreadcrumbSchema } from "@/seo/structuredData";

const ease = [0.16, 1, 0.3, 1] as const;
const spring = { type: "spring" as const, stiffness: 380, damping: 26 };

type ItemAccent = {
  tile: string;
  icon: string;
  hover: string;
};

const ITEM_ACCENTS: Record<string, ItemAccent> = {
  "Daily streak": {
    tile: "bg-orange-500/12 border-orange-500/25",
    icon: "text-orange-600",
    hover: "group-hover:bg-orange-500/18",
  },
  "All Skills": {
    tile: "bg-indigo-500/12 border-indigo-500/25",
    icon: "text-indigo-600",
    hover: "group-hover:bg-indigo-500/18",
  },
  Leaderboard: {
    tile: "bg-amber-500/12 border-amber-500/25",
    icon: "text-amber-600",
    hover: "group-hover:bg-amber-500/18",
  },
  "Refer & Earn": {
    tile: "bg-rose-500/12 border-rose-500/25",
    icon: "text-rose-600",
    hover: "group-hover:bg-rose-500/18",
  },
  Premium: {
    tile: "bg-violet-500/12 border-violet-500/25",
    icon: "text-violet-600",
    hover: "group-hover:bg-violet-500/18",
  },
  "About Us": {
    tile: "bg-cyan-500/12 border-cyan-500/25",
    icon: "text-cyan-700",
    hover: "group-hover:bg-cyan-500/18",
  },
  "Contact Page": {
    tile: "bg-primary/10 border-primary/25",
    icon: "text-primary",
    hover: "group-hover:bg-primary/16",
  },
  "Email Support": {
    tile: "bg-sky-500/12 border-sky-500/25",
    icon: "text-sky-600",
    hover: "group-hover:bg-sky-500/18",
  },
  "Share Feedback": {
    tile: "bg-emerald-500/12 border-emerald-500/25",
    icon: "text-emerald-600",
    hover: "group-hover:bg-emerald-500/18",
  },
  "Privacy Policy": {
    tile: "bg-teal-500/12 border-teal-500/25",
    icon: "text-teal-700",
    hover: "group-hover:bg-teal-500/18",
  },
  "Terms of Service": {
    tile: "bg-slate-500/10 border-slate-500/20",
    icon: "text-slate-600",
    hover: "group-hover:bg-slate-500/16",
  },
};

const SECTION_TINT = [
  "from-primary/8 via-transparent to-transparent",
  "from-sky-500/6 via-transparent to-transparent",
  "from-teal-500/6 via-transparent to-transparent",
] as const;

export const InfoPage = () => {
  const reduceMotion = useReducedMotion();
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: "Explore Skillful",
      items: [
        {
          to: "/streak",
          icon: Flame,
          title: "Daily streak",
          description: "See your practice streak, weekly activity, and freezes.",
        },
        {
          to: "/skills",
          icon: BookOpen,
          title: "All Skills",
          description: "Browse and practice interactive scenario categories.",
        },
        {
          to: "/leaderboard",
          icon: Trophy,
          title: "Leaderboard",
          description: "Check out top performers and your current rank.",
        },
        {
          to: "/refer",
          icon: Gift,
          title: "Refer & Earn",
          description: "Invite your friends and earn premium bonuses.",
        },
        {
          to: "/premium",
          icon: Sparkles,
          title: "Premium",
          description: "Unlock all skills, AI practice, and exclusive content.",
        },
        {
          to: "/about",
          icon: Info,
          title: "About Us",
          description: "Learn more about the mission and theory behind Skillful.",
        },
      ],
    },
    {
      title: "Help & Support",
      items: [
        {
          to: "/contact",
          icon: HelpCircle,
          title: "Contact Page",
          description: "Send us a message or request specific features.",
        },
        {
          href: "mailto:shashank@skillfulglobal.com",
          icon: Mail,
          title: "Email Support",
          description: "Reach out directly via shashank@skillfulglobal.com.",
        },
        {
          href: "https://forms.gle/54XXvLbfHAtJX7fF6",
          icon: MessageSquare,
          title: "Share Feedback",
          description: "Fill out our quick feedback form to help us improve.",
          isExternal: true,
        },
      ],
    },
    {
      title: "Legal & Policies",
      items: [
        {
          to: "/privacy",
          icon: Shield,
          title: "Privacy Policy",
          description: "How we collect, protect, and handle your data.",
        },
        {
          to: "/terms",
          icon: FileText,
          title: "Terms of Service",
          description: "The rules and terms governing app usage.",
        },
      ],
    },
  ];

  return (
    <MainLayout>
      <SeoHead
        title="Info & Support"
        description="Access help, support, feedback, legal documentation, and general links for the Skillful mobile application."
        path="/info"
        structuredData={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Info", path: "/info" },
          ]),
        ]}
      />

      <div className="relative min-h-[80vh]">
        <FloatingOrbs vivid />
        <div
          className="pointer-events-none absolute inset-0 -z-[1] bg-dot-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 pt-3 pb-24 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mb-8"
          >
            <div className="flex items-start gap-3.5">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...spring, delay: 0.05 }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm shadow-primary/10"
              >
                <motion.div
                  animate={
                    reduceMotion
                      ? {}
                      : { rotate: [0, 8, -6, 0], scale: [1, 1.06, 1] }
                  }
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Compass className="h-5 w-5 text-primary" strokeWidth={2.25} />
                </motion.div>
              </motion.div>
              <div>
                <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-3xl">
                  <span className="text-gradient">Info & support</span>
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Navigate Skillful, get help, or share feedback.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-7">
            {sections.map((section, sectionIdx) => (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * sectionIdx, duration: 0.4, ease }}
              >
                <h2 className="section-label mb-2.5 flex items-center gap-2 px-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden />
                  {section.title}
                </h2>

                <div
                  className={`overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-sm shadow-primary/[0.04] backdrop-blur-sm bg-gradient-to-b ${SECTION_TINT[sectionIdx] ?? SECTION_TINT[0]}`}
                >
                  {section.items.map((item, itemIdx) => {
                    const accent = ITEM_ACCENTS[item.title] ?? ITEM_ACCENTS["Contact Page"];
                    const delay = sectionIdx * 0.05 + itemIdx * 0.04;

                    const content = (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 + delay, duration: 0.35, ease }}
                        className="flex items-center gap-3.5 px-4 py-3.5"
                      >
                        <motion.div
                          whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: 4 }}
                          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                          transition={spring}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${accent.tile} ${accent.hover}`}
                        >
                          <item.icon
                            className={`h-[18px] w-[18px] ${accent.icon}`}
                            strokeWidth={2}
                          />
                        </motion.div>
                        <div className="min-w-0 flex-1 text-left">
                          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        {item.isExternal ? (
                          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/80 transition-colors group-hover:text-primary" />
                        ) : (
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/80 transition-all group-hover:translate-x-1 group-hover:text-primary" />
                        )}
                      </motion.div>
                    );

                    const rowClass =
                      "group block w-full border-b border-border/50 transition-colors last:border-0 hover:bg-primary/[0.04] active:bg-primary/[0.06]";

                    if ("href" in item) {
                      return (
                        <a
                          key={item.title}
                          href={item.href}
                          target={item.isExternal ? "_blank" : undefined}
                          rel={item.isExternal ? "noopener noreferrer" : undefined}
                          className={rowClass}
                        >
                          {content}
                        </a>
                      );
                    }

                    return (
                      <Link key={item.title} to={item.to} className={rowClass}>
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            className="mt-14 border-t border-border/80 pt-6 text-center"
          >
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} Skillful. All rights reserved.
            </p>
            <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-muted-foreground/70">
              Micro-learning scenarios to sharpen real-world instincts.
            </p>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
};

export default InfoPage;
