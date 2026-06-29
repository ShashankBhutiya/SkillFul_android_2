import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  BookOpen, 
  ExternalLink, 
  FileText, 
  Gift, 
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
          to: "/skills",
          icon: BookOpen,
          title: "All Skills",
          description: "Browse and practice interactive scenario categories.",
          color: "text-blue-500 bg-blue-500/10",
        },
        {
          to: "/leaderboard",
          icon: Trophy,
          title: "Leaderboard",
          description: "Check out top performers and your current rank.",
          color: "text-amber-500 bg-amber-500/10",
        },
        {
          to: "/refer",
          icon: Gift,
          title: "Refer & Earn",
          description: "Invite your friends and earn premium bonuses.",
          color: "text-emerald-500 bg-emerald-500/10",
        },
        {
          to: "/about",
          icon: Info,
          title: "About Us",
          description: "Learn more about the mission and theory behind Skillful.",
          color: "text-indigo-500 bg-indigo-500/10",
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
          color: "text-sky-500 bg-sky-500/10",
        },
        {
          href: "mailto:shashank@skillfulglobal.com",
          icon: Mail,
          title: "Email Support",
          description: "Reach out directly via shashank@skillfulglobal.com.",
          color: "text-pink-500 bg-pink-500/10",
        },
        {
          href: "https://forms.gle/54XXvLbfHAtJX7fF6",
          icon: MessageSquare,
          title: "Share Feedback",
          description: "Fill out our quick feedback form to help us improve.",
          color: "text-purple-500 bg-purple-500/10",
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
          color: "text-teal-500 bg-teal-500/10",
        },
        {
          to: "/terms",
          icon: FileText,
          title: "Terms of Service",
          description: "The rules and terms governing app usage.",
          color: "text-violet-500 bg-violet-500/10",
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

      <div className="relative mx-auto max-w-3xl px-4 py-12 pb-24 sm:px-6">
        {/* Dot grid background for mobile styling */}
        <div className="absolute inset-0 -z-10 bg-dot-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" aria-hidden />

        {/* Header */}
        <div className="text-center sm:text-left mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="flex flex-col items-center sm:items-start gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <img 
                src="/favicon.png" 
                alt="Skillful Logo" 
                className="h-9 w-9 rounded-xl object-cover"
              />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Info & Support
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Everything you need to navigate Skillful, get help, or share feedback.
            </p>
          </motion.div>
        </div>

        {/* Section Cards list */}
        <div className="space-y-10">
          {sections.map((section, sectionIdx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * sectionIdx, duration: 0.5, ease }}
              className="space-y-4"
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                {section.title}
              </h2>
              <div className="grid gap-3.5">
                {section.items.map((item) => {
                  const content = (
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.color} transition-transform group-hover:scale-105 duration-300`}>
                          <item.icon className="h-5.5 w-5.5" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-sm text-foreground transition-colors group-hover:text-primary">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                        {item.isExternal ? (
                          <ExternalLink className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                        ) : (
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        )}
                      </div>
                    </div>
                  );

                  const cardClass = "group block w-full rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-sm transition-all hover:shadow-md hover:border-primary/20 hover:bg-card/85 active:scale-[0.99]";

                  if ('href' in item) {
                    return (
                      <a
                        key={item.title}
                        href={item.href}
                        target={item.isExternal ? "_blank" : undefined}
                        rel={item.isExternal ? "noopener noreferrer" : undefined}
                        className={cardClass}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.title}
                      to={item.to}
                      className={cardClass}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer info (Copyright, etc.) inside the layout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-16 flex flex-col items-center justify-center gap-2 pt-8 border-t border-border/50 text-center"
        >
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} Skillful. All rights reserved.
          </p>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-xs">
            Micro-learning scenarios to sharpen real-world instincts.
          </p>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default InfoPage;
