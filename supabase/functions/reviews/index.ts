// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function createDbClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const key =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('SUPABASE_SECRET_KEY') ||
    Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !key) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(supabaseUrl, key)
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only GET allowed
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const url = new URL(req.url)
    const provider = url.searchParams.get('provider') || 'google'
    const place_id = url.searchParams.get('place_id')

    if (!place_id) {
      return new Response(JSON.stringify({ error: 'place_id required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = createDbClient()

    const { data, error } = await supabase
      .from('reviews_snapshots')
      .select('*')
      .eq('provider', provider)
      .eq('place_id', place_id)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    // Aucun snapshot trouvé
    if (!data) {
      return new Response(JSON.stringify({
        message: 'No snapshot found'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    // Parse reviews JSON
    let reviews = []
    try {
      reviews = data.reviews_json ? JSON.parse(data.reviews_json) : []
    } catch {
      reviews = []
    }

    // Optionnel : limiter ou trier
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 10))
    const sortMode = url.searchParams.get('sort') || ''

    if (sortMode.toLowerCase() === 'best') {
      reviews = reviews
        .slice()
        .sort((a: any, b: any) => {
          const ra = Number(a.rating || 0)
          const rb = Number(b.rating || 0)
          if (rb !== ra) return rb - ra
          return Number(b.time || 0) - Number(a.time || 0)
        })
        .slice(0, limit)
    } else {
      reviews = reviews.slice(0, limit)
    }

    return new Response(JSON.stringify({
      id: data.id,
      provider: data.provider,
      place_id: data.place_id,
      fetched_at: data.fetched_at,
      avg_rating: data.avg_rating,
      total_reviews: data.total_reviews,
      reviews
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })

  } catch (error: any) {
    console.error('Error:', error)

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
})