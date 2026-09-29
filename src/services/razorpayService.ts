import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

export interface PlanDetails {
  id: string;
  name: string;
  price: number;
  interval: "monthly" | "yearly";
}

export const PLANS: Record<"monthly" | "yearly", PlanDetails> = {
  monthly: {
    id: "plan_monthly",
    name: "Skillful Premium - Monthly",
    price: 299,
    interval: "monthly",
  },
  yearly: {
    id: "plan_yearly",
    name: "Skillful Premium - Yearly",
    price: 1799,
    interval: "yearly",
  },
};

export const COLLEGE_YEARLY_PLAN: PlanDetails = {
  id: "plan_college_yearly",
  name: "Skillful Premium - College Yearly",
  price: 50,
  interval: "yearly",
};

export const COLLEGE_INTERVIEW_PLAN: PlanDetails = {
  id: "plan_college_interview_yearly",
  name: "Skillful Interview Premium - College Yearly",
  price: 250,
  interval: "yearly",
};

export const COLLEGE_INTERVIEW_UPGRADE: PlanDetails = {
  id: "plan_college_interview_upgrade",
  name: "Skillful Interview Premium Upgrade",
  price: 200,
  interval: "yearly",
};

/**
 * Service to manage subscription billing with Razorpay.
 * Supports a local sandbox mode for seamless testing without keys.
 */
export const razorpayService = {
  /**
   * Simulate a secure subscription checkout (Sandbox Mode)
   */
  async upgradeToPremiumMock(
    userId: string,
    plan: PlanDetails
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        throw new Error("Supabase client is not initialized.");
      }

      // Calculate period end based on plan interval
      const days = plan.interval === "monthly" ? 30 : 365;
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + days);

      const mockSubId = `sub_mock_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

      // Update profiles database directly
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_id: mockSubId,
          subscription_period_end: periodEnd.toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error("Subscription update failed:", err);
      return { success: false, error: err.message || "Failed to update profile." };
    }
  },

  /**
   * Cancel/Refund subscription (Sandbox Mode)
   */
  async cancelPremiumMock(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        throw new Error("Supabase client is not initialized.");
      }

      // Revert status to inactive
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "inactive",
          subscription_id: null,
          subscription_period_end: null,
        })
        .eq("id", userId);

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error("Subscription cancellation failed:", err);
      return { success: false, error: err.message || "Failed to cancel subscription." };
    }
  },
};
