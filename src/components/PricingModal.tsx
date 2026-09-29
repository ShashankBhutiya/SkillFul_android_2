import { useState } from "react";
import { createPortal } from "react-dom";
import { motion as fm, AnimatePresence as Ap } from "framer-motion";
import { X, Check, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hapticSuccess, hapticError, hapticLight } from "@/hooks/useHaptics";
import { COLLEGE_INTERVIEW_PLAN, COLLEGE_INTERVIEW_UPGRADE, COLLEGE_YEARLY_PLAN, PLANS } from "@/services/razorpayService";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const extractErrorMessage = async (error: any): Promise<string> => {
  if (!error) return "An unknown error occurred.";
  if (error.context instanceof Response) {
    try {
      const responseClone = error.context.clone();
      const errorData = await responseClone.json();
      return errorData.error || errorData.message || error.message;
    } catch (_) {
      try {
        const text = await error.context.clone().text();
        return text || error.message;
      } catch (_) {
        return error.message;
      }
    }
  }
  return error.message || "Failed to perform operation.";
};

const PricingModal = ({ isOpen, onClose }: PricingModalProps) => {
  const { user, refreshProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [selectedCollegePlan, setSelectedCollegePlan] = useState<"basic" | "interview">("interview");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle");
  const isCollegeStudent = !!user.hasLinkedCollege;
  const canUpgradeInterview = isCollegeStudent && user.isPremium && user.subscriptionStatus === "active" &&
    user.subscriptionTier === "basic" && !user.hasInterviewAccess;

  if (!isOpen) return null;

  const plan = isCollegeStudent
    ? canUpgradeInterview
      ? COLLEGE_INTERVIEW_UPGRADE
      : selectedCollegePlan === "interview" ? COLLEGE_INTERVIEW_PLAN : COLLEGE_YEARLY_PLAN
    : PLANS[selectedPlan];
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

      const planType = isCollegeStudent
        ? canUpgradeInterview
          ? "college_interview_upgrade"
          : selectedCollegePlan === "interview" ? "college_interview_yearly" : "college_yearly"
        : selectedPlan;

      // Request edge function to create a new standard Razorpay Order
      const { data, error } = await supabase.functions.invoke("razorpay-checkout", {
        body: { planType }
      });

      if (error || !data) {
        const message = await extractErrorMessage(error);
        throw new Error(message);
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        // Required for UPI apps (Google Pay, PhonePe, Paytm, etc.) to open
        // from Razorpay Checkout when the web app is running in an Android WebView.
        // It is ignored by regular desktop/mobile browsers, where Razorpay selects
        // the appropriate UPI flow (such as QR) automatically.
        webview_intent: true,
        name: "Skillful Premium",
        description: `Upgrade to ${planType} Premium`,
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
                planType
              }
            });

            if (verifyError || !verifyData || !verifyData.success) {
              const message = await extractErrorMessage(verifyError);
              throw new Error(message);
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
          color: "#3B82F6"
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

  const handleClose = () => {
    setPaymentStatus("idle");
    onClose();
  };

  return createPortal(
    <Ap>
      {isOpen && (
        <fm.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <fm.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden bg-card/95 border border-white/10 rounded-3xl p-6 shadow-2xl text-center"
            >
              {/* Top sparkles background */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {paymentStatus === "success" || user.hasInterviewAccess ? (
                <fm.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-8 flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                    <ShieldCheck className="w-9 h-9" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                    {paymentStatus === "success" ? "Upgrade Successful!" : "Premium Active"}
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-xs mb-8">
                    <>Welcome to <strong className="text-foreground">Interview Premium</strong>. Continuous job-description interview practice is now unlocked.</>
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 text-sm font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Start Practicing
                  </button>
                </fm.div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider mb-3 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Premium Upgrade
                    </div>
                    <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">
                      Skillful Premium
                    </h2>
                    <p className="text-muted-foreground text-xs mt-1">
                      Invest in your real-life skills & professional growth
                    </p>
                  </div>


                  {/* Features List */}
                  <div className="space-y-3 mb-6 text-left">
                    {[
                      "Unlock all locked premium categories instantly",
                      "Unlimited questions, scenarios, and swipes",
                      ...(isCollegeStudent && (canUpgradeInterview || selectedCollegePlan === "interview")
                        ? ["Continuous interview questions from any job description"] : []),
                      "Support our creation of new modules and guides",
                      "Seamless and premium ad-free experience",
                    ].map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-foreground/90">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {isCollegeStudent && !canUpgradeInterview && <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-2xl border border-border/40 mb-6">
                    <button type="button" onClick={() => setSelectedCollegePlan("basic")} className={`relative py-3.5 rounded-xl text-xs font-bold transition-all ${selectedCollegePlan === "basic" ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"}`}>₹50 Student</button>
                    <button type="button" onClick={() => setSelectedCollegePlan("interview")} className={`relative py-3.5 rounded-xl text-xs font-bold transition-all ${selectedCollegePlan === "interview" ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"}`}>₹250 Interview</button>
                  </div>}

                  {!isCollegeStudent && <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-2xl border border-border/40 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSelectedPlan("monthly");
                      }}
                      className={`relative py-3.5 rounded-xl text-xs font-bold transition-all ${
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
                      className={`relative py-3.5 rounded-xl text-xs font-bold transition-all ${
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
                  </div>}

                  {/* Price Details */}
                  <div className="mb-6 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-3xl font-display font-extrabold text-foreground">
                        ₹{plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm font-semibold">
                        / {plan.interval === "monthly" ? "month" : "year"}
                      </span>
                    </div>
                    {isCollegeStudent ? (
                      <p className="text-[11px] text-primary font-bold mt-1">
                        {canUpgradeInterview
                          ? "Upgrade for the rest of your current annual term."
                          : selectedCollegePlan === "interview" ? "Includes continuous interview practice." : "Student Premium features only."}
                      </p>
                    ) : selectedPlan === "yearly" && (
                      <p className="text-[11px] text-primary font-bold mt-1">
                        Just ₹150 / month (billed yearly at ₹1,799)
                      </p>
                    )}
                  </div>

                  {/* Checkout Trigger */}
                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full relative flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground py-3.5 text-sm font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing Secure Payment...
                      </>
                    ) : (
                      <>
                        {canUpgradeInterview ? "Upgrade for ₹200" : selectedCollegePlan === "interview" ? "Get Interview Premium" : "Get Student Premium"}
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-muted-foreground/60 mt-4 max-w-[280px] mx-auto">
                    Securely encrypted via Razorpay. Access is immediately bound to your email account: <strong>{user.email || "Guest"}</strong>
                  </p>
                </>
              )}
            </fm.div>
          </div>
        </fm.div>
      )}
    </Ap>,
    document.body
  );
};

export default PricingModal;
