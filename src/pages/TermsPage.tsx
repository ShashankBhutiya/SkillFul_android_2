import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Shield, 
  User, 
  MessageSquare, 
  Clock, 
  Key, 
  Users, 
  HelpCircle, 
  Mail, 
  ArrowRight,
  Scale,
  FileText,
  Lock,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Ban,
  DollarSign,
  Gift
} from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { MainLayout } from "@/components/layout/MainLayout";
import { buildBreadcrumbSchema } from "@/seo/structuredData";

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    icon: Shield,
    content: (
      <div className="space-y-3">
        <p>
          By creating an account, participating in quizzes, browsing scenarios, or utilizing any services provided by <strong>Skillful</strong> ("we," "our," or "us"), you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service.
        </p>
        <p>
          If you do not agree with any part of these terms, you must immediately cease all access to the platform and associated applications.
        </p>
      </div>
    )
  },
  {
    id: "eligibility",
    title: "2. Eligibility & Age Requirements",
    icon: User,
    content: (
      <div className="space-y-3">
        <p>
          Skillful is intended for users who are at least 18 years of age. By accessing or registering on the platform, you represent and warrant that:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>You are at least 18 years old and possess the legal capacity to enter into a binding agreement.</li>
          <li>Your access to or use of the services does not violate any local laws or regulations in your jurisdiction.</li>
        </ul>
      </div>
    )
  },
  {
    id: "accounts",
    title: "3. User Registration & Account Security",
    icon: Key,
    content: (
      <div className="space-y-3">
        <p>To save your progress, track performance statistics, and unlock learning rewards, you must register for an account. You agree to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide accurate, current, and complete email, phone, and registration information.</li>
          <li>Maintain the security of your password and credentials, and accept all risk of unauthorized access to your account.</li>
          <li>Promptly notify us at <a href="mailto:shashank@skillfulglobal.com" className="text-primary hover:underline">shashank@skillfulglobal.com</a> if you discover or suspect any unauthorized login or security breach.</li>
        </ul>
      </div>
    )
  },
  {
    id: "disclaimer_content",
    title: "4. Scope of Learning & Content Disclaimer",
    icon: BookOpen,
    content: (
      <div className="space-y-3">
        <p>
          Skillful is an interactive practice gym designed to help you exercise decision-making judgment through bite-sized, simulated quiz scenarios covering parenting, career growth, leadership, salary negotiation, and finance.
        </p>
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 space-y-2 text-xs">
          <p className="font-bold flex items-center gap-1.5 text-warning-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            Important Disclaimer
          </p>
          <p>
            All content, explanations, tips, and mock scenario outcomes on Skillful are for educational and self-improvement purposes only. They do not constitute formal medical, mental health, career, legal, financial, or tax advice. You should always consult with qualified professionals regarding your specific real-world circumstances before making critical decisions.
          </p>
        </div>
      </div>
    )
  },
  {
    id: "communications",
    title: "5. Optional Communications & Reminders",
    icon: MessageSquare,
    content: (
      <div className="space-y-3">
        <p>
          We provide optional alerts and notifications to help users build consistent learning habits. A practice streak day is earned only after completing a milestone of five answered scenarios; opening the app alone does not earn or extend a streak.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Consent:</strong> By providing your mobile number and opting in, you authorize us to send learning reminders and account updates through the communication channel you select.
          </li>
          <li><strong>Charges:</strong> Carrier message or data rates may apply where relevant.</li>
          <li><strong>Opt-Out:</strong> You can withdraw consent at any time from your account preferences or by using the opt-out instructions in a message.</li>
          <li><strong>Phone Calls:</strong> Permission for occasional calls about learning progress, product updates, or support is optional and separate from SMS, WhatsApp, and email. To withdraw it, turn off the call option in Profile Settings and save, tell us during a call, or contact shashank@skillfulglobal.com. Declining calls does not restrict access to Skillful.</li>
        </ul>
      </div>
    )
  },
  {
    id: "referrals",
    title: "6. Referral Program & Reward Policies",
    icon: Gift,
    content: (
      <div className="space-y-3">
        <p>
          Registered users may participate in our referral program by sharing personalized referral codes. To ensure fair participation:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Referral codes must only be shared with personal contacts or in public channels where you have authorization.</li>
          <li>You are strictly prohibited from creating fake accounts, self-referring, or utilizing automation/bots to inflate referral counts.</li>
          <li>We reserve the right to audit account activity, revoke pending rewards, and terminate accounts found to be abusing the referral system.</li>
        </ul>
      </div>
    )
  },
  {
    id: "subscriptions",
    title: "7. Premium Subscriptions, Payments & Refunds",
    icon: DollarSign,
    content: (
      <div className="space-y-3">
        <p>
          Skillful offers premium features and unlimited scenario practices through paid subscription plans (including Monthly and Yearly options).
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Payment Processing:</strong> All subscription payments are processed securely through our payment gateway partner, <strong>Razorpay</strong>. By upgrading to premium, you agree to comply with Razorpay's terms and privacy policies.
          </li>
          <li>
            <strong>Billing Cycles:</strong> Subscriptions are billed in advance on a recurring monthly or yearly basis depending on the plan selected. Your subscription will automatically renew under the same terms unless cancelled by you or us.
          </li>
          <li>
            <strong>Cancellation:</strong> You can cancel your subscription at any time. Upon cancellation, you will continue to have access to premium features until the end of your current billing cycle.
          </li>
          <li>
            <strong>Refunds:</strong> Since Skillful provides immediate full access to all premium learning content upon upgrading, all purchases and subscription fees are non-refundable, except as required by applicable local law.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "intellectual_property",
    title: "8. Intellectual Property Rights",
    icon: FileText,
    content: (
      <div className="space-y-3">
        <p>
          Unless otherwise stated, all materials on the platform—including quiz questions, correct/incorrect explanations, graphic interfaces, website design, text layout, mascot characters, icons, logos, and code—are the intellectual property of Skillful.
        </p>
        <p>
          We grant you a limited, non-exclusive, non-transferable, revocable license to access the app for personal, non-commercial education. You may not copy, scrape, distribute, reproduce, or frame any platform content without our explicit written consent.
        </p>
      </div>
    )
  },
  {
    id: "conduct",
    title: "9. Prohibited Conduct",
    icon: Ban,
    content: (
      <div className="space-y-3">
        <p>You agree not to engage in any of the following restricted activities:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Automating page requests or quiz swipes via scripts, bots, or scrapers.</li>
          <li>Modifying, copying, reverse-engineering, or hacking any backend logic, Supabase database triggers, or API endpoints.</li>
          <li>Impersonating another user or sharing login credentials to share account access.</li>
          <li>Using the service for commercial resale or building competing educational services based on our database of scenarios.</li>
        </ul>
      </div>
    )
  },
  {
    id: "warranties",
    title: "10. Disclaimer of Warranties",
    icon: AlertTriangle,
    content: (
      <div className="space-y-3">
        <p>
          Our services are provided on an <strong>"as is"</strong> and <strong>"as available"</strong> basis, without warranties of any kind, either express or implied, including but not limited to merchantability, fitness for a particular purpose, uptime availability, or error-free calculations.
        </p>
        <p>
          We do not guarantee that the educational content will guarantee career promotion, financial gain, parenting success, or relationship improvements.
        </p>
      </div>
    )
  },
  {
    id: "liability",
    title: "11. Limitation of Liability",
    icon: Lock,
    content: (
      <div className="space-y-3">
        <p>
          To the maximum extent permitted by applicable law, Skillful and its operators shall not be liable for any indirect, incidental, punitive, special, or consequential damages, or any loss of profits, revenue, data, or reputation arising from your access to, use of, or inability to use the platform.
        </p>
      </div>
    )
  },
  {
    id: "governing_law",
    title: "12. Governing Law & Dispute Resolution",
    icon: Scale,
    content: (
      <div className="space-y-3">
        <p>
          These Terms of Service, and any disputes or claims arising out of or in connection with them, shall be governed by and construed in accordance with the laws of <strong>India</strong>.
        </p>
        <p>
          Any legal action, suit, or proceeding arising out of these terms shall be instituted exclusively in the competent courts located in New Delhi, India.
        </p>
      </div>
    )
  },
  {
    id: "termination",
    title: "13. Account Termination & Deletion",
    icon: Clock,
    content: (
      <div className="space-y-3">
        <p>
          <strong>By Us:</strong> We reserve the right, without notice and at our sole discretion, to terminate or suspend your license to use the platform, disable your account, and block your future access if we determine that you have violated these Terms of Service.
        </p>
        <p>
          <strong>By You:</strong> You may cease using the platform or delete your account at any time. If you wish to permanently delete your account and erase all associated personal learning progress and profile details, you may submit a request as described in our Privacy Policy (either via email to <a href="mailto:shashank@skillfulglobal.com" className="text-primary hover:underline font-semibold">shashank@skillfulglobal.com</a> or through the Contact Page).
        </p>
      </div>
    )
  },
  {
    id: "updates",
    title: "14. Changes to These Terms",
    icon: Clock,
    content: (
      <div className="space-y-3">
        <p>
          We may update these Terms of Service from time to time.
        </p>
        <p>
          When changes are made, we will update the "Last Updated" date at the top of this page. Your continued use of the platform following the posting of changes constitutes your binding acceptance of the updated terms.
        </p>
      </div>
    )
  },
  {
    id: "contact",
    title: "15. Contact Information",
    icon: Mail,
    content: (
      <div className="space-y-3">
        <p>
          If you have questions regarding these Terms of Service, user rules, or system operations, please contact us at:
        </p>
        <a 
          href="mailto:shashank@skillfulglobal.com" 
          className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15 transition-all mt-1"
        >
          <Mail className="h-4 w-4" />
          shashank@skillfulglobal.com
        </a>
      </div>
    )
  }
];

const TermsPage = () => {
  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // account for sticky header
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <MainLayout>
      <SeoHead
        title="Terms of Service"
        description="Read Skillful's terms of service governing user accounts, quiz scoring, referral rewards, and platforms rules."
        path="/terms"
        keywords={["skillful terms of service", "terms of use", "user agreement"]}
        structuredData={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Terms of Service", path: "/terms" },
          ]),
        ]}
      />

      <div className="relative min-h-screen bg-background">
        {/* Subtle background glow */}
        <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Terms of Service</span>
          </nav>

          {/* Page Header */}
          <motion.div 
            initial="initial"
            animate="animate"
            variants={fadeUp}
            className="mb-14 max-w-3xl"
          >
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Terms of Service
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Last updated: September 8, 2026
              </span>
              <span className="hidden sm:inline">•</span>
              <span>Effective: Immediate upon account creation</span>
            </div>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Welcome to Skillful. By using our swipe-based quiz learning modules, registering an account, or claiming referral rewards, you agree to comply with the rules and guidelines detailed below.
            </p>
          </motion.div>

          {/* Layout Grid */}
          <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
            {/* Sidebar Sticky Table of Contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-1.5 rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-md">
                <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border/40">
                  On this page
                </p>
                <nav className="flex flex-col gap-1 pt-2" aria-label="Terms of service section index">
                  {SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => handleScroll(sec.id)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
                    >
                      <sec.icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                      <span className="truncate">{sec.title.replace(/^\d+\.\s*/, '')}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Terms Content */}
            <div className="space-y-6">
              {SECTIONS.map((sec, idx) => (
                <motion.section
                  key={sec.id}
                  id={sec.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  className="group relative rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:border-border hover:shadow-md md:p-8"
                >
                  <div className="flex items-center gap-3 border-b border-border/40 pb-4 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:scale-105">
                      <sec.icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      {sec.title}
                    </h2>
                  </div>
                  <div className="text-sm leading-relaxed text-muted-foreground space-y-3 font-body">
                    {sec.content}
                  </div>
                </motion.section>
              ))}

              {/* Bottom Callout banner */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-6 text-center md:p-8"
              >
                <h3 className="font-display text-lg font-bold text-foreground">Ready to sharpen your real-life judgment?</h3>
                <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto">
                  Practice daily scenarios covering career strategy, communication, dating, boundaries, and financial literacy.
                </p>
                <div className="mt-5">
                  <Link
                    to="/skills"
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold text-background shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    Start Practicing Free
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TermsPage;
