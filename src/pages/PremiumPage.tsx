import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, Sparkles, ShieldCheck, Loader2, ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hapticSuccess, hapticError, hapticLight } from "@/hooks/useHaptics";
import { PLANS } from "@/services/razorpayService";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { MainLayout } from "@/components/layout/MainLayout";
import { SeoHead } from "@/components/SeoHead";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PremiumPage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle");

  const plan = PLANS[selectedPlan];
  const originalYearlyCost = PLANS.monthly.price * 12; // 3588
  const savings = Math.round(((originalYearlyCost - PLANS.yearly.price) / originalYearlyCost) * 100);

  const handleCheckout = async () => {
    if (user.isGuest) {
      hapticError();
      toast({
        title: "Sign In Required",
        description: "Please create an account or sign in to upgrade to Premium.",
        variant: "destructive",
      });
      return;
    }

    hapticLight();
    setIsProcessing(true);
    setPaymentStatus("idle");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      hapticError();
      toast({
        title: "Load Error",
        description: "Failed to load Razorpay payment library. Please check your network.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      // Request edge function to create a new standard Razorpay Order
      const { data, error } = await supabase.functions.invoke("razorpay-checkout", {
        body: { planType: selectedPlan }
      });

      if (error || !data) {
        throw new Error(error?.message || "Failed to create payment order.");
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "Skillful Premium",
        description: `Upgrade to ${selectedPlan} Premium`,
        handler: async function (response: any) {
          try {
            toast({
              title: "Payment Received",
              description: "Verifying payment signature...",
            });

            // Call verify function to validate signature securely on server-side
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-verify", {
              body: {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planType: selectedPlan
              }
            });

            if (verifyError || !verifyData || !verifyData.success) {
              throw new Error(verifyError?.message || "Signature verification failed.");
            }

            hapticSuccess();
            setPaymentStatus("success");
            await refreshProfile();
            toast({
              title: "Upgrade Active! 🎉",
              description: `Thank you! Your Premium status is now active.`,
            });
          } catch (err: any) {
            hapticError();
            setPaymentStatus("error");
            toast({
              title: "Verification Failed",
              description: err.message || "Failed to verify transaction signature.",
              variant: "destructive",
            });
            setIsProcessing(false);
          }
        },
        prefill: {
          email: user.email,
          contact: user.phone || ""
        },
        theme: {
          color: "#6366F1"
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      hapticError();
      setPaymentStatus("error");
      toast({
        title: "Checkout Error",
        description: err.message || "Could not complete transaction.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleStartPracticing = () => {
    navigate("/skills");
  };

  return (
    <MainLayout>
      <SeoHead
        title="Premium Upgrade"
        description="Upgrade to Skillful Premium to unlock all learning categories and get unlimited rapid-fire scenarios."
        path="/premium"
      />

      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6 flex justify-start">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </div>

        {paymentStatus === "success" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface mx-auto flex max-w-lg flex-col items-center px-8 py-14 text-center"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Upgrade successful
            </h2>
            <p className="mb-7 mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Welcome to <strong className="font-medium text-foreground">Skillful Premium</strong>. All
              premium skill topics and rapid-fire scenarios are now unlocked.
            </p>
            <button
              onClick={handleStartPracticing}
              className="w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start practicing
            </button>
          </motion.div>
        ) : (
          <div className="mt-2 grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Features (Left side) */}
            <div className="space-y-7 lg:col-span-7">
              <div>
                <span className="section-label">Premium access</span>
                <h1 className="mt-2.5 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl">
                  Unchain your instincts.
                </h1>
                <p className="mt-3.5 text-[15px] leading-relaxed text-muted-foreground">
                  Practice high-value real-world dilemmas in salary framing, leadership tactics,
                  office politics, and relationships. Build instincts that last a lifetime.
                </p>
              </div>

              {/* Features List — a plain checklist. Four bordered cards
                  each with its own tinted icon tile competed with the
                  pricing card, which is the actual call to action. */}
              <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {[
                  {
                    title: "Full Category Access",
                    desc: "Instantly unlock all professional and personal skill topics.",
                    icon: Shield
                  },
                  {
                    title: "Unlimited Swipes",
                    desc: "Unlimited daily practice scenarios with instant feedback.",
                    icon: Star
                  },
                  {
                    title: "Support Future Topics",
                    desc: "Empower our team to develop new modules and expert guides.",
                    icon: Sparkles
                  },
                  {
                    title: "Premium Experience",
                    desc: "Zero distractive ads or popups. Focus on your growth.",
                    icon: Check
                  }
                ].map((feat, idx) => (
                  <li key={idx} className="flex gap-3">
                    <feat.icon
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary"
                      strokeWidth={1.75}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{feat.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {feat.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Billing Card (Right side) */}
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="surface relative p-6 sm:p-7"
              >
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Choose a plan
                </h2>
                <p className="mb-5 mt-1 text-xs text-muted-foreground">
                  Simple pricing for professional growth
                </p>

                {/* Plan Toggle */}
                <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setSelectedPlan("monthly");
                    }}
                    className={`rounded-md py-2.5 text-xs font-semibold transition-colors ${
                      selectedPlan === "monthly"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setSelectedPlan("yearly");
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-semibold transition-colors ${
                      selectedPlan === "yearly"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yearly
                    {/* Inline, not a floating badge clipped by the
                        container's rounded corner. */}
                    <span className="text-[10px] font-semibold tabular-nums text-primary">
                      −{savings}%
                    </span>
                  </button>
                </div>

                {/* Dynamic Price Display */}
                <div className="mb-5 border-y border-border py-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[34px] font-semibold leading-none tabular-nums text-foreground">
                      ₹{plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {plan.interval === "monthly" ? "month" : "year"}
                    </span>
                  </div>
                  {selectedPlan === "yearly" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Works out to ₹150 / month, billed yearly at ₹1,799.
                    </p>
                  )}
                </div>

                {/* Checkout Trigger */}
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing payment…
                    </>
                  ) : (
                    "Upgrade to Premium"
                  )}
                </button>

                <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                  Securely encrypted via Razorpay. Access is bound to{" "}
                  <strong className="font-medium text-foreground">{user?.email || "Guest"}</strong>.
                </p>
              </motion.div>
            </div>

          </div>
        )}
      </section>
    </MainLayout>
  );
};

export default PremiumPage;
