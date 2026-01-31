import fetch from 'node-fetch'; // si Node < 18, sinon Node 18+ a fetch global
import { createClient } from '@supabase/supabase-js';

// Crée ton client Supabase
const supabaseUrl = 'https://ecgujuutpxebpjwdwhcy.supabase.co';
const supabaseKey = 'VOTRE_ANON_KEY_ICI';
const supabase = createClient(supabaseUrl, supabaseKey);

// URL de la Edge Function newsletter
const URL = 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/newsletter';

async function testNewsletterGet() {
  try {
    // Récupérer la session actuelle (si utilisateur déjà connecté)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Erreur récupération session :', sessionError);
      return;
    }
    if (!sessionData.session) {
      console.error('Pas de session utilisateur active.');
      return;
    }

    const ACCESS_TOKEN = sessionData.session.access_token;

    // Appel GET avec token
    const res = await fetch(URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error('Erreur HTTP:', res.status, res.statusText);
      const errText = await res.text();
      console.error('Body:', errText);
      return;
    }

    const data = await res.json();
    console.log('Résultat de la fonction newsletter GET :', data);

  } catch (err) {
    console.error('Erreur fetch:', err);
  }
}

// Lancer le test
testNewsletterGet();
