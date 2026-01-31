// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from reviews function!")

// CORS headers centralisés
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

async function fetchAndStoreGoogleReviews(place_id: string, api_key: string, language = 'fr') {
  if (!place_id || !api_key) throw new Error('place_id and api_key required')
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=rating,user_ratings_total,reviews&language=${encodeURIComponent(language)}&key=${encodeURIComponent(api_key)}`
  console.log('Fetching Google Places (lang=' + language + '):', url.replace(/key=[^&]+/, 'key=REDACTED'))

  const response = await fetch(url)
  const result = await response.json()

  if (result.status !== 'OK') {
    throw new Error(`Google Places API error: ${result.status}`)
  }

  console.log('reviews: fetched from Google, reviews count=', (result.result.reviews || []).length)

  const rawReviews = result.result.reviews || []
  const reviews = rawReviews.slice(0, 50).map((r: any) => ({
    author: r.author_name,
    rating: r.rating,
    time: r.time,
    relative_time_description: r.relative_time_description || '',
    text: r.text
  }))

  const now = new Date().toISOString()
  const avg = result.result.rating || 0
  const total = result.result.user_ratings_total || 0

  const payload = {
    provider: 'google',
    place_id,
    fetched_at: now,
    avg_rating: avg,
    total_reviews: total,
    reviews_json: JSON.stringify(reviews)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  const { data: existing, error: exErr } = await supabase
    .from('reviews_snapshots')
    .select('id, fetched_at, avg_rating, total_reviews')
    .eq('provider', 'google')
    .eq('place_id', place_id)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (exErr) throw exErr

  let data
  if (existing) {
    console.log('reviews: updating existing id', existing.id)
    const { data: updateData, error } = await supabase
      .from('reviews_snapshots')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .limit(1)
      .single()
    if (error) throw error
    data = updateData
  } else {
    const { data: insertData, error } = await supabase
      .from('reviews_snapshots')
      .insert(payload)
      .select()
      .limit(1)
      .single()
    if (error) throw error
    data = insertData
  }

  return {
    id: data.id,
    provider: data.provider,
    place_id: data.place_id,
    fetched_at: data.fetched_at,
    avg_rating: data.avg_rating,
    total_reviews: data.total_reviews,
    reviews
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

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
    const refresh = url.searchParams.get('refresh') === 'true' || url.searchParams.get('refresh') === '1'
    const lang = url.searchParams.get('language') || 'fr'

    if (!place_id) {
      return new Response(JSON.stringify({ error: 'place_id required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (refresh) {
      try {
        const key = Deno.env.get('REV_API_KEY')
        if (!key) {
          return new Response(JSON.stringify({ error: 'server missing REV_API_KEY for refresh' }), {
            status: 400,
            headers: corsHeaders,
          })
        }
        const fetched = await fetchAndStoreGoogleReviews(place_id, key, lang)
        return new Response(JSON.stringify(fetched), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      } catch (err: any) {
        console.warn('reviews: forced refresh failed', err.message)
        return new Response(JSON.stringify({ error: err.message || 'refresh failed' }), {
          status: 500,
          headers: corsHeaders,
        })
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    const { data, error } = await supabase
      .from('reviews_snapshots')
      .select('*')
      .eq('provider', provider)
      .eq('place_id', place_id)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return new Response(JSON.stringify({}), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    let reviews = []
    try {
      reviews = data.reviews_json ? JSON.parse(data.reviews_json) : []
    } catch (e) {
      reviews = []
    }

    // Support sorting/filtering from client: ?sort=best&limit=10
    const sortMode = url.searchParams.get('sort') || ''
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 10))

    if (sortMode.toLowerCase() === 'best') {
      // Sort by rating desc, then by time desc (most recent among highest rated)
      reviews = reviews.slice().sort((a: any, b: any) => {
        const ra = Number(a.rating || 0), rb = Number(b.rating || 0)
        if (rb !== ra) return rb - ra
        const ta = Number(a.time || 0), tb = Number(b.time || 0)
        return tb - ta
      }).slice(0, limit)
    } else {
      // default: return latest reviews as stored (first N)
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
})
