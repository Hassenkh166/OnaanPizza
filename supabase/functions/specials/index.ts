// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from specials function!")

// CORS headers centralisés
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const id = pathParts[pathParts.length - 1] // Get the last part of the path

    if (req.method === 'GET') {
      // Check auth for admin operations
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), {
          status: 401,
          headers: corsHeaders,
        })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: corsHeaders,
        })
      }

      const { data, error } = await supabase
        .from('specials')
        .select('id, title, description, price, img, created_at')
        .order('id', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify(data || []), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    if (req.method === 'POST') {
      // Check auth for admin operations
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), {
          status: 401,
          headers: corsHeaders,
        })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: corsHeaders,
        })
      }

      const { title, description, price, img } = await req.json()

      if (!title) {
        return new Response(JSON.stringify({ error: 'title required' }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const { data, error } = await supabase
        .from('specials')
        .insert({
          title,
          description: description || '',
          price: price || '',
          img: img || ''
        })
        .select()
        .limit(1)
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ id: data.id }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    if (req.method === 'PUT') {
      // Check auth for admin operations
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), {
          status: 401,
          headers: corsHeaders,
        })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: corsHeaders,
        })
      }

      const { id, title, description, price, img } = await req.json()

      if (!id) {
        return new Response(JSON.stringify({ error: 'Special ID required' }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const { data, error } = await supabase
        .from('specials')
        .update({
          title,
          description: description || '',
          price: price || '',
          img: img || ''
        })
        .eq('id', id)
        .select()
        .limit(1)
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ changes: 1 }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    if (req.method === 'DELETE') {
      // Check auth for admin operations
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), {
          status: 401,
          headers: corsHeaders,
        })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: corsHeaders,
        })
      }

      const { id } = await req.json()

      if (!id) {
        return new Response(JSON.stringify({ error: 'Special ID required' }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const { error } = await supabase
        .from('specials')
        .delete()
        .eq('id', id)

      if (error) throw error

      return new Response(JSON.stringify({ deleted: 1 }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  } catch (error) {
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
