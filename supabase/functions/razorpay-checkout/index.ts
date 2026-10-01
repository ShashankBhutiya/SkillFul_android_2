import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../shared/cors.ts'
import { isPaidSubscriptionActive } from '../shared/subscription.ts'

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const reference = crypto.randomUUID().slice(0, 8)
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
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRole) {
      throw new Error('Supabase payment configuration is incomplete.')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get user context from active token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false },
    })

    // 3. Extract planType details from POST request
    const { planType } = await req.json()
    const validPlanTypes = ['monthly', 'yearly', 'college_yearly', 'college_interview_yearly', 'college_interview_upgrade']
    if (typeof planType !== 'string' || !validPlanTypes.includes(planType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing subscription plan.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // A verified college membership only changes the price; it does not grant
    // Premium on its own. College-linked students may buy the annual plan for ₹50.
    const { data: collegeMembership, error: membershipError } = await supabaseAdmin
      .from('institution_members')
      .select('institution_id')
      .eq('user_id', user.id)
      .eq('role', 'student')
      .maybeSingle()

    if (membershipError) {
      console.error('Could not check college membership:', membershipError)
      throw new Error('Could not verify college membership.')
    }

    const isCollegeStudent = Boolean(collegeMembership)
    const collegePlan = planType.startsWith('college_')
    if (collegePlan && !isCollegeStudent) {
      return new Response(
        JSON.stringify({ error: 'This student price requires a linked college account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (isCollegeStudent && !collegePlan) {
      return new Response(
        JSON.stringify({ error: 'Choose one of the college-linked annual plans.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (planType === 'college_interview_upgrade') {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status,subscription_period_end,subscription_tier')
        .eq('id', user.id)
        .maybeSingle()
      if (profileError?.code === '42703') {
        return new Response(
          JSON.stringify({ error: 'The payment service update is not complete yet. Please try again shortly.', code: 'database_not_ready', reference }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (profileError || !isPaidSubscriptionActive(profile?.subscription_status, profile?.subscription_period_end) || profile?.subscription_tier === 'interview') {
        return new Response(
          JSON.stringify({ error: 'The ₹200 upgrade requires an active ₹50 Student Premium plan.', code: 'upgrade_not_eligible', reference }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const amountInRupees = planType === 'college_yearly' ? 50
      : planType === 'college_interview_yearly' ? 250
      : planType === 'college_interview_upgrade' ? 200
      : planType === 'monthly' ? 299 : 1799
    const amountInPaise = amountInRupees * 100

    // 4. Connect to Razorpay API to create payment Order
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: 'Razorpay Key ID or Secret is not configured in Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

    // Create Order payload
    const payload = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_user_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        userId: user.id,
        userEmail: user.email || '',
        planType: planType,
        offer: collegePlan ? planType : `standard_${planType}`,
      }
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    })

    const razorpayRaw = await response.text()
    let razorpayData: any = {}
    try { razorpayData = JSON.parse(razorpayRaw) } catch { /* handled below */ }

    if (!response.ok) {
      console.error('Razorpay Order API error:', razorpayData)
      return new Response(
        JSON.stringify({ error: razorpayData.error?.description || 'Razorpay could not create the payment order. Please retry.', code: 'razorpay_order_failed', reference }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the successful order parameters back to the client
    return new Response(
      JSON.stringify({
        order_id: razorpayData.id,
        key_id: razorpayKeyId,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Checkout Order function error:', { reference, err })
    return new Response(
      JSON.stringify({ error: 'The payment service could not start checkout. Please try again shortly.', code: 'checkout_failed', reference }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
