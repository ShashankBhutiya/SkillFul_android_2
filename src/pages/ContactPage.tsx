import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Send, CheckCircle2, MessageSquare } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { MainLayout } from "@/components/layout/MainLayout";
import { buildBreadcrumbSchema, buildOrganizationSchema } from "@/seo/structuredData";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const inputClassName =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";

const ContactPage = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulate a short network delay
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <MainLayout>
      <SeoHead
        title="Contact Skillful"
        description="Contact Skillful for support, feedback, partnerships, and product questions."
        path="/contact"
        keywords={["contact skillful", "skillful support", "skillful feedback"]}
        structuredData={[
          buildOrganizationSchema(),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
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
            <span className="text-foreground">Contact</span>
          </nav>
          <motion.div {...fadeUp} className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Get in Touch
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Have a question, idea, or partnership opportunity? We would love to hear from you. Fill out the form below or reach out directly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-5">
            {/* Form */}
            <motion.div
              {...fadeUp}
              className="lg:col-span-3"
            >
              <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm md:p-10">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center py-12 text-center"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="mt-6 font-display text-2xl font-bold text-foreground">
                        Message Sent
                      </h3>
                      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                        Thank you for reaching out. We will get back to you as soon as possible.
                      </p>
                      <button
                        onClick={() => {
                          setSubmitted(false);
                          setForm({ name: "", email: "", subject: "", message: "" });
                        }}
                        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                      >
                        Send Another Message
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      <div>
                        <h2 className="font-display text-2xl font-bold text-foreground">
                          Send Us a Message
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Fill out the fields below and we will respond within 24 hours.
                        </p>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                            Name
                          </label>
                          <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Your name"
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                            Email
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            className={inputClassName}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-foreground">
                          Subject
                        </label>
                        <input
                          id="subject"
                          name="subject"
                          type="text"
                          required
                          value={form.subject}
                          onChange={handleChange}
                          placeholder="What is this about?"
                          className={inputClassName}
                        />
                      </div>

                      <div>
                        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-foreground">
                          Message
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          value={form.message}
                          onChange={handleChange}
                          placeholder="Tell us more..."
                          className={`${inputClassName} resize-none`}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sending}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-60"
                      >
                        {sending ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Message
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Sidebar Info */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="space-y-6 lg:col-span-2"
            >
              <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                  Email Us Directly
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  For support, feedback, partnership conversations, or product suggestions.
                </p>
                <a
                  href="mailto:shashank@skillfulglobal.com"
                  className="mt-4 inline-block text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  shashank@skillfulglobal.com
                </a>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                  Response Time
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We typically respond within 24 hours on business days. For urgent issues, please mention it in the subject line.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default ContactPage;
