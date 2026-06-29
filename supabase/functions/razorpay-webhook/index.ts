import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

serve(async (req) => {
  // CORS handles are generally not needed for incoming third-party webhooks,
  // but we keep basic safety.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const signature = req.headers.get('x-razorpay-signature')
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      console.warn('Webhook signature verification failed: signature or secret is missing.')
      return new Response(JSON.stringify({ error: 'Unauthorized signature configuration' }), { status: 400 })
    }

    const rawBody = await req.text()

    // --- Verify Razorpay HMAC SHA256 Signature ---
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )

    // Convert hex signature to Uint8Array bytes
    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    )

    const isSignatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(rawBody)
    )

    if (!isSignatureValid) {
      console.warn('Webhook received but signature was invalid.')
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), { status: 401 })
    }

    // --- Signature Validated: Process Event payload ---
    const payload = JSON.parse(rawBody)
    const eventType = payload.event
    const subscription = payload.payload.subscription?.entity

    if (!subscription) {
      console.info(`No subscription entity found in event: ${eventType}. Ignoring.`)
      return new Response(JSON.stringify({ success: true, message: 'Non-subscription event ignored' }), { status: 200 })
    }

    // Extract metadata details
    const userId = subscription.notes?.userId || subscription.notes?.user_id
    const subscriptionId = subscription.id
    const status = subscription.status // authenticated, active, halted, cancelled, completed

    if (!userId) {
      console.error(`No userId found in subscription notes for subscription: ${subscriptionId}`)
      return new Response(JSON.stringify({ error: 'No userId in metadata' }), { status: 400 })
    }

    // Initialize Supabase Admin client (requires service role key to write/bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false }
    })

    console.info(`Processing subscription webhook: event=${eventType}, status=${status}, user=${userId}`)

    if (eventType === 'subscription.charged') {
      // Get expiry period (Unix timestamp seconds from Razorpay, convert to ISO date)
      const currentEndUnix = subscription.current_end
      const periodEnd = currentEndUnix ? new Date(currentEndUnix * 1000).toISOString() : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_id: subscriptionId,
          subscription_period_end: periodEnd,
        })
        .eq('id', userId)

      if (error) throw error
      console.info(`Successfully activated user ${userId} subscription.`)
    } else if (
      eventType === 'subscription.cancelled' ||
      eventType === 'subscription.halted' ||
      eventType === 'subscription.completed'
    ) {
      // Revert user to inactive
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'inactive',
          subscription_id: null,
          subscription_period_end: null,
        })
        .eq('id', userId)

      if (error) throw error
      console.info(`Successfully cancelled user ${userId} subscription.`)
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Webhook processing failed' }), { status: 500 })
  }
})
