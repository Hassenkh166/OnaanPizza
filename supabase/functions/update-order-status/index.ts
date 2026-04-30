import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, APIKey, X-Client-Info, apikey, authorization',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { order_id, new_status } = await req.json()

    // Validation
    if (!order_id || !new_status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: new_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update order status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If status is "preparing", update loyalty
    let loyaltyInfo = null

    if (new_status === 'preparing') {
      const LOYALTY_THRESHOLD = 100 // 100€ for free product
      const FREE_PRODUCT_VALUE = 10 // Free product worth ~10€
      const RESET_DAYS = 14 // Reset loyalty if last order > 14 days ago

      try {
        const phone_number = order.phone_number
        const order_total = parseFloat(order.total)

        // Get or create loyalty record
        const { data: loyaltyData } = await supabase
          .from('loyalty')
          .select('*')
          .eq('phone_number', phone_number)
          .single()

        let currentTotalSpent = 0
        let currentPointsBalance = 0
        let currentFreeProductsEarned = 0
        let currentFreeProductsUsed = 0

        if (loyaltyData) {
          // Check if last order was more than 14 days ago
          const lastOrderDate = new Date(loyaltyData.last_order_date)
          const now = new Date()
          const daysSinceLastOrder = (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)

          currentTotalSpent = parseFloat(loyaltyData.total_spent)
          currentPointsBalance = parseFloat(loyaltyData.points_balance)
          currentFreeProductsEarned = loyaltyData.free_products_earned
          currentFreeProductsUsed = loyaltyData.free_products_used

          // Reset loyalty if more than 14 days have passed
          if (daysSinceLastOrder > RESET_DAYS) {
            console.log(`Resetting loyalty for ${phone_number}: ${daysSinceLastOrder.toFixed(1)} days since last order`)
            currentTotalSpent = 0
            currentPointsBalance = 0
            currentFreeProductsEarned = 0
            currentFreeProductsUsed = 0
          }
        }

        // Update loyalty with current order
        const newTotalSpent = currentTotalSpent + order_total
        const newPointsBalance = currentPointsBalance + order_total

        // Calculate free products earned
        const productsEarned = Math.floor(newPointsBalance / LOYALTY_THRESHOLD)
        const newFreeProductsEarned = currentFreeProductsEarned + productsEarned

        // Reset points balance after earning a product
        const remainingBalance = newPointsBalance % LOYALTY_THRESHOLD

        // Update or insert loyalty record
        if (loyaltyData) {
          const { error: loyaltyError } = await supabase
            .from('loyalty')
            .update({
              total_spent: newTotalSpent,
              points_balance: remainingBalance,
              free_products_earned: newFreeProductsEarned,
              free_products_used: currentFreeProductsUsed,
              last_order_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('phone_number', phone_number)

          if (loyaltyError) {
            console.error('Loyalty update error:', loyaltyError)
          }
        } else {
          // Create new loyalty record
          const { error: insertError } = await supabase
            .from('loyalty')
            .insert([{
              phone_number,
              total_spent: newTotalSpent,
              points_balance: remainingBalance,
              free_products_earned: newFreeProductsEarned,
              free_products_used: 0,
              last_order_date: new Date().toISOString(),
            }])

          if (insertError) {
            console.error('Loyalty insert error:', insertError)
          }
        }

        loyaltyInfo = {
          phone_number,
          total_spent: newTotalSpent,
          points_balance: remainingBalance,
          free_products_earned: newFreeProductsEarned,
          free_products_used: currentFreeProductsUsed,
          new_free_product: productsEarned > 0,
          free_product_value: FREE_PRODUCT_VALUE,
          current_order_total: order_total,
        }
      } catch (err) {
        console.error('Loyalty system error:', err)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id,
        new_status,
        loyalty: loyaltyInfo,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
