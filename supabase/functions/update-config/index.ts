// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from update-config function!")

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'PUT',
      },
    })
  }

  // Only allow PUT
  if (req.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    console.log('PUT /api/config received:', JSON.stringify(body, null, 2))

    // Get existing config
    const { data: existingArr, error: selErr } = await supabase
      .from('configuration')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)

    if (selErr) throw selErr
    const existing = (existingArr && existingArr[0]) ? existingArr[0] : null

    // Cleanup removed images (simplified - no filesystem logs in serverless)
    try {
      function parseLenientJson(value: any) {
        let v = value
        for (let i = 0; i < 4; i++) {
          if (typeof v === 'string') {
            try { v = JSON.parse(v) } catch (e) { break }
          } else break
        }
        return v
      }

      const oldHeroParsed = existing ? parseLenientJson(existing.hero_images || []) : []
      const oldHeroArr = Array.isArray(oldHeroParsed) ? oldHeroParsed.map((h: any) => (typeof h === 'string' ? h : (h && h.path ? h.path : null))).filter(Boolean) : []
      const newHeroArr = Array.isArray(body.hero_images) ? body.hero_images.map((h: any) => (typeof h === 'string' ? h : (h && h.path ? h.path : null))).filter(Boolean) : []
      const removedHeroes = oldHeroArr.filter((x: string) => !newHeroArr.includes(x))

      const baseStoragePrefix = Deno.env.get('SUPABASE_URL')!.replace(/\/$/, '') + `/storage/v1/object/public/${Deno.env.get('SUPABASE_STORAGE_BUCKET') || 'images'}/`
      for (const url of removedHeroes) {
        if (typeof url === 'string' && url.indexOf(baseStoragePrefix) !== -1) {
          const parts = url.split('/')
          const filename = decodeURIComponent(parts[parts.length - 1] || '')
          if (filename) {
            const { error: remErr } = await supabase.storage.from(Deno.env.get('SUPABASE_STORAGE_BUCKET') || 'images').remove([filename])
            if (remErr) console.warn('Failed to remove hero image from storage', remErr)
          }
        }
      }

      // Logo cleanup
      const oldLogo = existing && existing.logo ? (typeof existing.logo === 'string' ? existing.logo : '') : ''
      const newLogo = typeof body.logo === 'string' ? body.logo : (existing ? existing.logo : '')
      if (oldLogo && newLogo && oldLogo !== newLogo && oldLogo.indexOf(baseStoragePrefix) !== -1) {
        const parts = oldLogo.split('/')
        const filename = decodeURIComponent(parts[parts.length - 1] || '')
        if (filename) {
          const { error: remErr } = await supabase.storage.from(Deno.env.get('SUPABASE_STORAGE_BUCKET') || 'images').remove([filename])
          if (remErr) console.warn('Failed to remove old logo from storage', remErr)
        }
      }
    } catch (e) {
      console.warn('Cleanup step failed', e)
    }

    // Prepare payload
    const payload = {
      theme: typeof body.theme === 'string' ? body.theme : (existing ? existing.theme : 'default'),
      hero_images: JSON.stringify(Array.isArray(body.hero_images) ? body.hero_images : (existing ? (existing.hero_images || []) : [])),
      logo: typeof body.logo === 'string' ? body.logo : (existing ? existing.logo : '/assets/images/logo.png'),
      restaurant_name: typeof body.restaurant_name === 'string' ? body.restaurant_name : (existing ? existing.restaurant_name : "O'naan Pizza"),
      about_images: JSON.stringify(Array.isArray(body.about_images) ? body.about_images : (existing ? (existing.about_images || []) : [])),
      primary_color: typeof body.primary_color === 'string' ? body.primary_color : (existing ? existing.primary_color : '#C41E3A'),
      secondary_color: typeof body.secondary_color === 'string' ? body.secondary_color : (existing ? existing.secondary_color : '#FF6B35'),
      accent_color: typeof body.accent_color === 'string' ? body.accent_color : (existing ? existing.accent_color : '#FFD700'),
      contact_address: typeof body.contact_address === 'string' ? body.contact_address : (existing ? existing.contact_address : ''),
      contact_phone: typeof body.contact_phone === 'string' ? body.contact_phone : (existing ? existing.contact_phone : ''),
      contact_email: typeof body.contact_email === 'string' ? body.contact_email : (existing ? existing.contact_email : ''),
      contact_hours: typeof body.contact_hours === 'string' ? body.contact_hours : (existing ? existing.contact_hours : '')
    }

    let result
    if (!existing) {
      const { data, error } = await supabase.from('configuration').insert(payload).select().limit(1).single()
      if (error) throw error
      result = { id: data.id }
    } else {
      const { data, error } = await supabase.from('configuration').update(payload).eq('id', existing.id).select().limit(1).single()
      if (error) throw error
      result = { changes: 1 }
    }

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  } catch (err: any) {
    console.error('Error in update-config:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }
})