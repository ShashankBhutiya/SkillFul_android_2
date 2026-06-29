import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Star, Sparkles, ShieldCheck, Loader2, ArrowLeft, Shield } from "lucide-react";
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
        {/* Dot grid background */}
        <div className="absolute inset-0 -z-10 bg-dot-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" aria-hidden />

        {/* Back Button */}
        <div className="mb-6 flex justify-start">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 rounded-full border border-border bg-card/65 px-4 py-2 text-xs font-bold text-foreground/80 hover:text-foreground hover:bg-muted transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </div>

        {paymentStatus === "success" ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-card/70 backdrop-blur-xl p-8 sm:p-10 shadow-2xl text-center flex flex-col items-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/10 animate-bounce">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">
              Upgrade Successful! 🎉
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
              Welcome to <strong className="text-foreground">Skillful Premium</strong>. All premium skill topics and rapid-fire scenarios are now unlocked for you. Happy learning!
            </p>
            <button
              onClick={handleStartPracticing}
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Practicing Now
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start mt-4">
            
            {/* Features (Left side) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  Premium Access
                </span>
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Unchain your instincts.<br />
                  <span className="text-gradient">Upgrade to Premium.</span>
                </h1>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Practice high-value real-world dilemmas in salary framing, leadership tactics, office politics, and relationships. Instantly build instincts that last a lifetime.
                </p>
              </div>


              {/* Features List */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
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
                  <div key={idx} className="p-5 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm flex flex-col justify-start">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mb-3">
                      <feat.icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-foreground">{feat.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Card (Right side) */}
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-white/10 bg-card/75 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden"
              >
                {/* Glowing glow effect */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

                <h2 className="text-2xl font-display font-extrabold text-foreground mb-1">
                  Choose a Plan
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Simple pricing for professional growth
                </p>

                {/* Plan Toggle */}
                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/40 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setSelectedPlan("monthly");
                    }}
                    className={`relative py-3 rounded-xl text-xs font-bold transition-all ${
                      selectedPlan === "monthly"
                        ? "bg-card text-foreground shadow-sm border border-border/40"
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
                    className={`relative py-3 rounded-xl text-xs font-bold transition-all ${
                      selectedPlan === "yearly"
                        ? "bg-card text-foreground shadow-sm border border-border/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yearly
                    <span className="absolute -top-2 -right-1 bg-primary text-primary-foreground text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-95 shadow-sm">
                      -{savings}%
                    </span>
                  </button>
                </div>

                {/* Dynamic Price Display */}
                <div className="mb-6 bg-muted/20 border border-border/30 rounded-2xl py-5 px-4 flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-4xl font-display font-extrabold text-foreground">
                      ₹{plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm font-semibold">
                      / {plan.interval === "monthly" ? "month" : "year"}
                    </span>
                  </div>
                  {selectedPlan === "yearly" && (
                    <p className="text-xs text-primary font-bold mt-2">
                      Just ₹150 / month (billed yearly at ₹1,799)
                    </p>
                  )}
                </div>

                {/* Checkout Trigger */}
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full relative flex items-center justify-center gap-2.5 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground py-4 text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-65"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Secure Payment...
                    </>
                  ) : (
                    <>
                      Upgrade to Premium
                    </>
                  )}
                </button>

                <p className="text-[10px] text-muted-foreground/60 mt-5 max-w-[280px] mx-auto leading-relaxed">
                  Securely encrypted via Razorpay. Access is immediately bound to your email account: <strong>{user?.email || "Guest"}</strong>
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
