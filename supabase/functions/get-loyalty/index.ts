import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get phone number from query params for GET request
    const url = new URL(req.url)
    const phone_number = url.searchParams.get('phone') || 
                        (req.method === 'POST' ? (await req.json()).phone_number : null)

    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get loyalty record for customer
    const { data: loyaltyData, error: loyaltyError } = await supabase
      .from('loyalty')
      .select('*')
      .eq('phone_number', phone_number)
      .single()

    if (loyaltyError && loyaltyError.code !== 'PGRST116') {
      console.error('Database error:', loyaltyError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch loyalty status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If customer not found, return default loyalty status
    if (!loyaltyData) {
      return new Response(
        JSON.stringify({
          success: true,
          customer_phone: phone_number,
          loyalty: {
            total_spent: 0,
            points_balance: 0,
            free_products_earned: 0,
            free_products_available: 0,
            free_products_used: 0,
            next_free_product_in: 100,
            is_new_customer: true,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate free products available
    const available = Math.max(0, loyaltyData.free_products_earned - loyaltyData.free_products_used)
    const nextProductIn = 100 - loyaltyData.points_balance

    return new Response(
      JSON.stringify({
        success: true,
        customer_phone: phone_number,
        loyalty: {
          total_spent: loyaltyData.total_spent,
          points_balance: loyaltyData.points_balance,
          free_products_earned: loyaltyData.free_products_earned,
          free_products_available: available,
          free_products_used: loyaltyData.free_products_used,
          next_free_product_in: Math.max(0, nextProductIn),
          last_order_date: loyaltyData.last_order_date,
          is_new_customer: false,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
