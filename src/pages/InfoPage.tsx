import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  BookOpen, 
  ExternalLink, 
  FileText, 
  Gift, 
  Flame,
  HelpCircle, 
  Info, 
  Mail, 
  MessageSquare, 
  Shield, 
  Trophy 
} from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { MainLayout } from "@/components/layout/MainLayout";
import { buildBreadcrumbSchema } from "@/seo/structuredData";

const ease = [0.16, 1, 0.3, 1] as const;

export const InfoPage = () => {
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

      <div className="relative mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease }}
          className="mb-8"
        >
          <h1 className="font-display text-[26px] font-semibold tracking-tight text-foreground sm:text-3xl">
            Info & support
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Navigate Skillful, get help, or share feedback.
          </p>
        </motion.div>

        {/* Grouped link lists. Each section is one bordered surface with
            hairline dividers, rather than N separate floating cards —
            the rows are a list, so they should look like one. */}
        <div className="space-y-8">
          {sections.map((section, sectionIdx) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * sectionIdx, duration: 0.35, ease }}
            >
              <h2 className="section-label mb-2.5 px-1">{section.title}</h2>

              <div className="surface divide-y divide-border overflow-hidden">
                {section.items.map((item) => {
                  const content = (
                    <div className="flex items-center gap-3.5 px-4 py-3.5">
                      {/* Uniform muted icons. The old version gave every
                          row its own hue, so nothing stood out. */}
                      <item.icon
                        className="h-[18px] w-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0 flex-1 text-left">
                        <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      {item.isExternal ? (
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      )}
                    </div>
                  );

                  const rowClass = "group block w-full transition-colors hover:bg-muted/50";

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

        {/* Footer info (Copyright, etc.) inside the layout */}
        <div className="mt-14 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} Skillful. All rights reserved.
          </p>
          <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-muted-foreground/70">
            Micro-learning scenarios to sharpen real-world instincts.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default InfoPage;
