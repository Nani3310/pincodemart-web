import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const validAmounts: Record<string, number> = {
  marketplace_access: 300,
  listing_ride: 9,
  listing_ticket: 9,
  listing_rental: 9,
  listing_service: 9,
  ad_tier_1: 500,
  ad_tier_2: 300,
  ad_tier_3: 150,
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { purpose, phone_digits, amount_inr, ad_id } = await req.json()

    if (!purpose || !phone_digits || !amount_inr) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (validAmounts[purpose] !== Number(amount_inr)) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount for payment purpose' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (purpose.startsWith('ad_') && !ad_id) {
      return new Response(
        JSON.stringify({ error: 'Advertisement reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (ad_id) {
      const { data: ad } = await supabase
        .from('advertisements')
        .select('id, shop_id, approval_status, payment_status')
        .eq('id', ad_id)
        .single()
      if (!ad || ad.approval_status !== 'pending' || ad.payment_status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Advertisement is no longer available for payment' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', ad.shop_id).single()
      if (!shop || shop.owner_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Advertisement does not belong to this account' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!

    const amountPaise = Math.round(amount_inr * 100)
    const receipt = `rcpt_${Date.now()}_${user.id.slice(0, 8)}`
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { purpose, phone_digits, user_id: user.id, ad_id: ad_id || null },
      }),
    })

    const orderData = await razorpayResponse.json()

    if (!razorpayResponse.ok) {
      console.error('Razorpay order error:', orderData)
      return new Response(
        JSON.stringify({ error: 'Failed to create Razorpay order' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store transaction record
    const { error: insertError } = await supabase.from('payment_transactions').insert({
      user_id: user.id,
      phone_digits,
      purpose,
      amount_inr,
      amount_paise: amountPaise,
      razorpay_order_id: orderData.id,
      status: 'created',
      metadata: { created_at: new Date().toISOString(), receipt, ad_id: ad_id || null },
    })

    if (insertError) {
      console.error('Error inserting transaction:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        transaction_id: transaction.id,
        order_id: orderData.id,
        amount_paise: orderData.amount,
        currency: orderData.currency,
        key_id: razorpayKeyId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
