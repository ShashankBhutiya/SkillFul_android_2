import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Shield, 
  Database, 
  MessageSquare, 
  Eye, 
  Key, 
  Users, 
  HelpCircle, 
  Mail, 
  Clock, 
  ArrowRight,
  Scale,
  FileText,
  CheckCircle2,
  Globe,
  Lock,
  ExternalLink,
  EyeOff,
  BarChart3
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
    id: "introduction",
    title: "1. Introduction & Overview",
    icon: Shield,
    content: (
      <div className="space-y-3">
        <p>
          Welcome to <strong>Skillful</strong> ("we," "our," or "us"). We are committed to protecting your privacy and ensuring a transparent, secure environment for our users. This Privacy Policy governs your access to and use of our platform, including our website at <a href="https://skillfulglobal.com" className="text-primary hover:underline font-semibold">skillfulglobal.com</a>, the mobile web application, and associated services.
        </p>
        <p>
          By creating an account, swiping through scenarios, or interacting with our services, you agree to the collection, use, and disclosure of information described in this policy. If you do not agree with these terms, please do not use our services.
        </p>
      </div>
    )
  },
  {
    id: "controller",
    title: "2. Data Controller",
    icon: FileText,
    content: (
      <div className="space-y-3">
        <p>
          Skillful is the operator of the Skillful platform and is responsible for the collection and processing of personal information described in this Privacy Policy.
        </p>
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5 text-xs">
          <p className="font-bold text-foreground">Contact details:</p>
          <p>Email: <a href="mailto:shashank@skillfulglobal.com" className="text-primary hover:underline">shashank@skillfulglobal.com</a></p>
          <p>Website: <a href="https://www.skillfulglobal.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.skillfulglobal.com</a></p>
        </div>
        <p className="text-xs text-muted-foreground italic">
          If Skillful operates through a registered business entity, references to Skillful include that legal entity.
        </p>
      </div>
    )
  },
  {
    id: "legal_basis",
    title: "3. Legal Basis for Processing",
    icon: CheckCircle2,
    content: (
      <div className="space-y-3">
        <p>We process personal information only where we have a lawful basis to do so, including:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>To provide and maintain the Skillful service.</li>
          <li>To fulfill contractual obligations to registered users.</li>
          <li>To improve platform functionality and user experience.</li>
          <li>To comply with legal obligations.</li>
          <li>Based on user consent for communications such as SMS reminders and optional marketing communications.</li>
        </ul>
      </div>
    )
  },
  {
    id: "collection",
    title: "4. Information We Collect",
    icon: Database,
    content: (
      <div className="space-y-4">
        <p>To provide a personalized learning gym for real-life skills, we collect information directly from you and automatically as you navigate the platform:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account Credentials:</strong> When you register an account, we collect your email address and secure password hashes to authenticate your sessions.
          </li>
          <li>
            <strong>Contact Channels:</strong> If you opt in, we collect your mobile phone number and communication preference to send learning updates and reminders through the selected channel.
          </li>
          <li>
            <strong>Phone Call Preferences:</strong> If you separately opt in to calls, we record the phone number, your choice, the consent wording and version, where the choice was made, and the time it was recorded. We keep a history of grants and withdrawals to respect your preferences. Existing accounts are not opted in automatically.
          </li>
          <li>
            <strong>Learning Activity:</strong> We record your correct/incorrect quiz responses, category completions, response-time data, and general progress metrics. We also record a practice-streak day only when you complete a milestone of five answered scenarios; simply opening the app does not create a streak record. This information is used to display performance stats, milestones, and recommendations.
          </li>
          <li>
            <strong>Referral Codes:</strong> If you use a friend's referral link or code, we associate that code with your account to calculate bonus milestones and community rewards.
          </li>
          <li>
            <strong>Device & Technical Metrics:</strong> We log standard client details, including IP address, browser metadata, operating system, and referral source, to ensure server stability.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "usage",
    title: "5. How We Use Your Information",
    icon: MessageSquare,
    content: (
      <div className="space-y-3">
        <p>We utilize the collected information to manage the platform and support your personal growth:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Operation:</strong> Authenticate users, restore progress across devices, and deliver core learning scenarios.</li>
          <li><strong>Personalization:</strong> Run interactive elements such as our Companion Mascot recommendations and smart coaching tips.</li>
          <li><strong>Reminders & Practice Habits:</strong> Deliver optional reminders through the communication channels you select and in-app notification cards. Streak-related reminders are based on completed practice milestones, not app opens.</li>
          <li><strong>Analytics & Improvement:</strong> Analyze trends and usage statistics to debug issues, adjust difficulty settings, and refine content categories.</li>
        </ul>
      </div>
    )
  },
  {
    id: "retention",
    title: "6. Data Retention",
    icon: Clock,
    content: (
      <div className="space-y-3">
        <p>We retain personal information only as long as reasonably necessary for the purposes described in this Privacy Policy. Typical retention periods include:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Account information:</strong> Until account deletion or closure.</li>
          <li><strong>Quiz progress and learning history:</strong> Until account deletion.</li>
          <li><strong>Technical logs and security records:</strong> Up to 12 months.</li>
          <li><strong>Customer support communications:</strong> Up to 24 months.</li>
        </ul>
        <p>Where legally required, we may retain information for longer periods.</p>
      </div>
    )
  },
  {
    id: "sharing",
    title: "7. Data Storage & Service Providers",
    icon: Users,
    content: (
      <div className="space-y-3">
        <p>
          We cooperate with reliable sub-processors to power our architecture:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Database & Auth (Supabase):</strong> We store all accounts, preferences, hashes, and quiz responses in Supabase databases protected by industry-standard encryption.
          </li>
          <li>
            <strong>Hosting & Deployment (Vercel):</strong> Our frontend bundle is served from Vercel's edge network securely.
          </li>
          <li>
            <strong>Communication (SMS Service Provider):</strong> If you choose to configure daily SMS practice reminders, your phone number is processed securely by our SMS delivery partner.
          </li>
          <li>
            <strong>Feedback Channels (Google Forms):</strong> Feedback and general inquiries sent through external forms are stored securely by Google.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "sale",
    title: "8. Sale of Personal Information",
    icon: EyeOff,
    content: (
      <div className="space-y-3">
        <p>
          <strong>Skillful does not sell, rent, trade, or otherwise monetize personal information provided by users.</strong>
        </p>
        <p>
          We do not share your individual profiles, progress data, email addresses, or phone numbers with advertising agencies or data brokers.
        </p>
      </div>
    )
  },
  {
    id: "sms",
    title: "9. Optional Messages & Phone Calls",
    icon: MessageSquare,
    content: (
      <div className="space-y-3">
        <p>
          SMS reminders are optional and are sent only to users who provide consent.
        </p>
        <p>
          Phone calls from Skillful about learning progress, product updates, or support require a separate call opt-in. Providing a number or agreeing to WhatsApp or SMS updates does not grant call permission. You can use Skillful without agreeing to calls.
        </p>
        <p>
          To withdraw call permission, turn off the phone-call option in Profile Settings and save, tell us during a call, or email shashank@skillfulglobal.com. Changing your phone number withdraws permission for the previous number; opt in again if you want calls at the new number.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Message frequency may vary.</li>
          <li>Standard carrier messaging rates may apply.</li>
          <li>Users may opt out at any time by replying <strong>STOP</strong> or by disabling reminders in account settings.</li>
        </ul>
      </div>
    )
  },
  {
    id: "analytics",
    title: "10. Analytics Technologies",
    icon: BarChart3,
    content: (
      <div className="space-y-3">
        <p>
          We use Google Analytics 4 (GA4) alongside other privacy-focused performance trackers to evaluate player metrics, response times, category popularity, and user journeys.
        </p>
        <p>
          Google Analytics 4 is integrated using Google Consent Mode v2, meaning no analytic cookies are saved on your device unless you explicitly opt in via our cookie consent settings. If consent is declined, GA4 is updated to run in cookieless mode, sending only basic, non-identifying telemetry to ensure we can diagnose game crashes and optimize swipe response rates.
        </p>
        <p>
          You can adjust your consent choices at any time via your browser settings or the cookie preferences toggles on our site.
        </p>
      </div>
    )
  },
  {
    id: "transfers",
    title: "11. International Data Transfers",
    icon: Globe,
    content: (
      <div className="space-y-3">
        <p>
          Our service providers may process or store information in countries outside your country of residence.
        </p>
        <p>
          By using Skillful, you acknowledge that your information may be transferred to and processed in jurisdictions with data protection laws that differ from those in your location. We take reasonable measures to ensure appropriate protection of personal information during such transfers.
        </p>
      </div>
    )
  },
  {
    id: "rights",
    title: "12. Your Privacy Rights",
    icon: HelpCircle,
    content: (
      <div className="space-y-3">
        <p>Depending on applicable law, you may have the right to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Access your personal information.</li>
          <li>Correct inaccurate information.</li>
          <li>Request deletion of personal information.</li>
          <li>Withdraw consent where processing relies on consent.</li>
          <li>Object to certain processing activities.</li>
          <li>Request a copy of information associated with your account.</li>
        </ul>
        <p>
          We aim to process deletion requests within 7 business days and no later than 30 days unless legal obligations require retention. Requests may be submitted to: <a href="mailto:shashank@skillfulglobal.com" className="text-primary hover:underline font-semibold">shashank@skillfulglobal.com</a>.
        </p>
      </div>
    )
  },
  {
    id: "dpdp",
    title: "13. Rights Under Indian Data Protection Law",
    icon: Scale,
    content: (
      <div className="space-y-3">
        <p>
          If you are located in India, you may have rights under applicable Indian data protection laws, including the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>.
        </p>
        <p>
          Subject to applicable law, you may request access, correction, updating, or deletion of personal information held by Skillful by sending a request to our compliance team.
        </p>
      </div>
    )
  },
  {
    id: "children",
    title: "14. Children's Privacy",
    icon: Users,
    content: (
      <div className="space-y-3">
        <p>
          Skillful is intended for users aged 18 years and above.
        </p>
        <p>
          We do not knowingly collect personal information from children. If we become aware that personal information has been collected from a child without required consent, we will take reasonable steps to delete such information.
        </p>
      </div>
    )
  },
  {
    id: "security",
    title: "15. Security Incidents",
    icon: Lock,
    content: (
      <div className="space-y-3">
        <p>
          While we employ reasonable technical and organizational safeguards, no electronic storage system or internet transmission method can be guaranteed completely secure.
        </p>
        <p>
          In the event of a significant security incident affecting personal information, we may notify affected users where required by applicable law.
        </p>
      </div>
    )
  },
  {
    id: "third_party",
    title: "16. Third-Party Services and Links",
    icon: ExternalLink,
    content: (
      <div className="space-y-3">
        <p>
          Our platform may contain links to third-party websites, forms, or services.
        </p>
        <p>
          We are not responsible for the privacy practices or content of third-party services. Users should review the privacy policies of those providers independently.
        </p>
      </div>
    )
  },
  {
    id: "cookies",
    title: "17. Cookies & Local Storage",
    icon: Eye,
    content: (
      <div className="space-y-3">
        <p>
          We use local browser storage and cookie tokens to keep you logged in across sessions, store quiz settings (such as volume levels or mascot preferences), remember your theme options, and temporarily cache progress and practice-streak data. Account streak data may also be synchronized with our database so it is available across devices. These files do not run programs or download spyware. You can clear cookies or limit local storage in your browser settings, though doing so might require signing in again or temporarily reset locally cached data.
        </p>
      </div>
    )
  },
  {
    id: "updates",
    title: "18. Changes to This Privacy Policy",
    icon: Clock,
    content: (
      <div className="space-y-3">
        <p>
          We may update this Privacy Policy periodically.
        </p>
        <p>
          Material changes will be reflected by updating the "Last Updated" date at the top of this page. Continued use of Skillful after updates constitutes acceptance of the revised Privacy Policy.
        </p>
      </div>
    )
  },
  {
    id: "contact",
    title: "19. Contact & Inquiries",
    icon: Mail,
    content: (
      <div className="space-y-3">
        <p>
          If you have questions, feedback, or concerns regarding your privacy, data handling, or terms compliance, please contact our privacy compliance team directly:
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

const PrivacyPage = () => {
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
        title="Privacy Policy"
        description="Read Skillful's privacy policy covering data handling, analytics, forms, and account-related information."
        path="/privacy"
        keywords={["skillful privacy policy", "privacy policy", "data handling policy"]}
        structuredData={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy" },
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
            <span className="text-foreground">Privacy Policy</span>
          </nav>

          {/* Page Header */}
          <motion.div 
            initial="initial"
            animate="animate"
            variants={fadeUp}
            className="mb-14 max-w-3xl"
          >
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Privacy Policy
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Last updated: September 8, 2026
              </span>
              <span className="hidden sm:inline">•</span>
              <span>Effective: Immediate upon user sign-up</span>
            </div>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              At Skillful, we are committed to protecting your privacy. This Privacy Policy explains how we handle accounts, learning activity, practice milestones, notifications, analytics, and your rights over personal data.
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
                <nav className="flex flex-col gap-1 pt-2" aria-label="Privacy policy section index">
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

            {/* Main Policy Content */}
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

export default PrivacyPage;
