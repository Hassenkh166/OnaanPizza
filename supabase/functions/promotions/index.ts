// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from promotions function!")

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
    const id = pathParts[pathParts.length - 1]

    // Read body once at the beginning
    let body: any = {}
    let requestMethod = req.method
    try {
      body = await req.json()
      if (body.method) {
        requestMethod = body.method.toUpperCase()
      }
    } catch (e) {
      // Not JSON or empty body, continue with normal flow
    }

    if (requestMethod === 'GET') {
      // Public read access - no auth required for listing promotions
      const requestId = body.id || (id && id !== 'promotions' ? id : null)

      if (requestId) {
        // Get single promotion
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .eq('id', requestId)
          .limit(1)
          .maybeSingle()

        if (error) throw error
        if (!data) {
          return new Response(JSON.stringify({ error: 'Promotion not found' }), {
            status: 404,
            headers: corsHeaders,
          })
        }

        return new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      } else {
        // List all promotions
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .order('id', { ascending: false })

        if (error) throw error

        return new Response(JSON.stringify(data || []), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }
    }

    if (requestMethod === 'POST' && !body.method) {
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

      const { title, subtitle, badge_text, image_url } = body
      if (!title || !subtitle) {
        return new Response(JSON.stringify({ error: 'Title and subtitle required' }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const { data, error } = await supabase
        .from('promotions')
        .insert({ title, subtitle, badge_text: badge_text || '', image_url: image_url || '' })
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

    if (requestMethod === 'PUT') {
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

      const { id: requestId, title, subtitle, badge_text, image_url } = body

      if (!requestId) {
        return new Response(JSON.stringify({ error: 'Promotion ID required' }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      // Fetch existing promotion to detect image change
      const { data: existing, error: exErr } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', requestId)
        .limit(1)
        .maybeSingle()

      if (exErr) throw exErr
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Promotion not found' }), {
          status: 404,
          headers: corsHeaders,
        })
      }

      // Note: Image cleanup would require additional logic for Supabase Storage
      // For now, we'll just update the record

      const { data, error } = await supabase
        .from('promotions')
        .update({ title, subtitle, badge_text: badge_text || '', image_url: image_url || '' })
        .eq('id', requestId)
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

    if (requestMethod === 'DELETE') {
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

      const { id: requestId } = body

      if (!requestId) {
        return new Response(JSON.stringify({ error: 'Promotion ID required' }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const { data: existing, error: exErr } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', requestId)
        .limit(1)
        .maybeSingle()

      if (exErr) throw exErr
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Promotion not found' }), {
          status: 404,
          headers: corsHeaders,
        })
      }

      // Note: Image cleanup would require additional logic for Supabase Storage
      // For now, we'll just delete the record

      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', requestId)

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
