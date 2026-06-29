# Razorpay Production Integration Guide

This guide explains how to transition your application from the sandbox (mock) testing environment to live production payments.

---

## Step 1: Deploy Supabase Edge Functions
Make sure you have successfully deployed your functions to your production Supabase project:
```bash
npx.cmd supabase functions deploy razorpay-checkout
npx.cmd supabase functions deploy razorpay-webhook
```

Once deployed, copy your **Webhook URL** from the Supabase Console. It will look like:
`https://rkillusuuyiqkoazbwtd.supabase.co/functions/v1/razorpay-webhook`

---

## Step 2: Configure the Razorpay Dashboard

1. **Log in** to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. **Switch to Live Mode** (or Keep in Test Mode for final staging validation).
3. **Create Subscription Plans**:
   - Navigate to **Subscriptions** → **Plans** → **Create Plan**.
   - Create a **Monthly Plan** (₹299/mo) and save the `plan_id` (looks like `plan_XXX`).
   - Create a **Yearly Plan** (₹1799/yr) and save the `plan_id` (looks like `plan_YYY`).
4. **Set Up the Webhook**:
   - Go to **Settings** → **Webhooks** → **Add New Webhook**.
   - **Webhook URL**: Paste your Supabase Webhook URL:
     `https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/razorpay-webhook`
   - **Secret**: Enter a secure random string (e.g. `my_secure_webhook_secret_123`). Save this string!
   - **Active Events**: Select the following subscription lifecycle events:
     - `subscription.charged` (Fires every time a recurring payment succeeds)
     - `subscription.cancelled` (Fires when subscription is terminated)
     - `subscription.halted` (Fires when card limits or transactions fail)
   - Save the Webhook.

---

## Step 3: Set Supabase Environment Variables

In your Supabase Dashboard, navigate to **Settings** → **Edge Functions** → **Environment Variables** (or use the CLI) and add these keys:
- `RAZORPAY_KEY_ID`: Your Razorpay Key ID (from Settings → API Keys).
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret.
- `RAZORPAY_WEBHOOK_SECRET`: The exact Webhook Secret string you entered in the Razorpay webhook dashboard.

---

## Step 4: Update the Frontend to Load Checkout Popup

Once your backend is ready, update the `handleCheckout` function in `src/components/PricingModal.tsx` to transition from mock checkout to the live Razorpay script.

Here is the code template you will paste into `src/components/PricingModal.tsx` when you are ready to switch:

```typescript
// 1. Dynamic script loader utility
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// 2. Updated handleCheckout method:
const handleCheckout = async () => {
  if (user.isGuest) {
    toast({ title: "Sign In Required", description: "Create an account to upgrade." });
    return;
  }

  setIsProcessing(true);

  // A. Load Razorpay script on demand
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    toast({ title: "Error", description: "Failed to load Razorpay library.", variant: "destructive" });
    setIsProcessing(false);
    return;
  }

  try {
    // B. Call your deployed Supabase Edge Function to create a live subscription
    const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
    const response = await fetch("https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/razorpay-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        planId: selectedPlan === "monthly" ? "PLAN_MONTHLY_ID_HERE" : "PLAN_YEARLY_ID_HERE"
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Subscription creation failed.");

    // C. Initialize Razorpay Checkout window
    const options = {
      key: data.key_id,
      subscription_id: data.subscription_id,
      name: "Skillful Premium",
      description: `Upgrade to ${selectedPlan} Premium`,
      handler: async function (response: any) {
        // Once payment succeeds:
        toast({ title: "Verifying payment status..." });
        
        // Refresh profiles database
        await refreshProfile();
        setPaymentStatus("success");
      },
      prefill: {
        email: user.email,
        contact: user.phone || ""
      },
      theme: {
        color: "#3B82F6"
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();

  } catch (err: any) {
    toast({ title: "Checkout Error", description: err.message, variant: "destructive" });
  } finally {
    setIsProcessing(false);
  }
};
```
