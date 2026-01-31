import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};
Deno.serve(async (req) => {
  // Réponse préflight OPTIONS
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Création du client Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  try {
    // GET → liste tous les abonnés
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('clients').select('id,email,date').order('date', { ascending: false }).limit(1000)
      if (error) throw error
      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    // POST → ajouter un nouvel email
    if (req.method === 'POST') {
      const body = await req.json()
      const email = body.email
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(JSON.stringify({ error: 'invalid email' }), { status: 400, headers: corsHeaders })
      }

      const { data: existing } = await supabase.from('clients').select('id,email').eq('email', email).limit(1).maybeSingle()
      if (existing) {
        return new Response(JSON.stringify({ message: 'already_subscribed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase.from('clients').insert({ email, date: now }).select().limit(1).single()
      if (error) throw error
      return new Response(JSON.stringify({ id: data.id, message: 'subscribed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // DELETE → supprimer un abonné par ID
    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const id = url.pathname.split('/').pop()
      if (!id || isNaN(Number(id))) {
        return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400, headers: corsHeaders })
      }

      const { error } = await supabase.from('clients').delete().eq('id', Number(id))
      if (error) throw error
      return new Response(JSON.stringify({ message: 'deleted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
