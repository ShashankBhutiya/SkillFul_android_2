import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"
import { corsHeaders } from '../shared/cors.ts'

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Supabase Client & Authenticate User JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get active user context
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Extract parameters from POST request
    const { orderId, paymentId, signature, planType } = await req.json()
    if (!orderId || !paymentId || !signature || !planType) {
      return new Response(
        JSON.stringify({ error: 'Missing required checkout verification fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (planType !== 'monthly' && planType !== 'yearly') {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription plan.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verify Razorpay Signature
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: 'Razorpay secret key not configured in Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const text = `${orderId}|${paymentId}`

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(text)
    )

    // Convert signature buffer to hex string
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const isValid = computedSignature === signature

    if (!isValid) {
      console.warn(`Payment verification failed: Signature mismatch for user ${user.id}`)
      return new Response(
        JSON.stringify({ error: 'Payment signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate the server-created order rather than trusting the amount or plan
    // submitted by the browser during verification.
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    if (!razorpayKeyId) {
      return new Response(
        JSON.stringify({ error: 'Razorpay key ID not configured in Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: { 'Authorization': `Basic ${authString}` },
    })
    const order = await orderResponse.json()
    if (!orderResponse.ok) {
      console.error('Could not retrieve Razorpay order:', order)
      return new Response(
        JSON.stringify({ error: 'Could not validate the payment order.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const offer = order.notes?.offer
    const expectedAmount = offer === 'college_yearly'
      ? 5000
      : offer === 'standard_monthly'
        ? 29900
        : offer === 'standard_yearly'
          ? 179900
          : null
    const expectedPlanType = offer === 'college_yearly'
      ? 'yearly'
      : offer === 'standard_monthly'
        ? 'monthly'
        : offer === 'standard_yearly'
          ? 'yearly'
          : null

    if (
      order.notes?.userId !== user.id ||
      order.notes?.planType !== planType ||
      expectedPlanType !== planType ||
      order.amount !== expectedAmount
    ) {
      console.warn(`Payment verification failed: invalid order details for user ${user.id}`)
      return new Response(
        JSON.stringify({ error: 'Payment order details do not match this subscription.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Signature Valid: Update Database Profile record using admin client (bypassing RLS)
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false }
    })

    const days = planType === 'monthly' ? 30 : 365
    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + days)

    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_id: paymentId,
        subscription_period_end: periodEnd.toISOString(),
      })
      .eq('id', user.id)

    if (dbError) {
      console.error('Failed to update user profile subscription:', dbError)
      throw dbError
    }

    console.info(`Signature verified. User ${user.id} subscription status activated successfully.`)
    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified and profile updated.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Signature verification function error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
