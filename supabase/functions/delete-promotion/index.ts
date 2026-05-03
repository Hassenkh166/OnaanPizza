// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from delete-promotion function!")

// CORS headers centralisés
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify authentication
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
      return new Response(JSON.stringify({ error: 'Promotion ID required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Fetch existing promotion to get image URL for deletion
    const { data: existing, error: exErr } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle()

    if (exErr) throw exErr
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Promotion not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    // Delete image from storage if it exists
    if (existing.image_url) {
      try {
        // Extract filename from Supabase Storage URL
        const urlParts = existing.image_url.split('/')
        const filename = urlParts[urlParts.length - 1]

        if (filename) {
          const { error: deleteError } = await supabase.storage
            .from('images')
            .remove([filename])

          if (deleteError) {
            console.warn('Failed to delete image:', deleteError)
          } else {
            console.log('Image deleted successfully:', filename)
          }
        }
      } catch (e) {
        console.warn('Error deleting image:', e)
      }
    }

    // Delete the promotion from database
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return new Response(JSON.stringify({ deleted: 1 }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
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