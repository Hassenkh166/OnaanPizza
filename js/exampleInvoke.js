import { supabase } from './supabaseClient.js';

async function callEdgeFunction() {
  const { data, error } = await supabase.functions.invoke('example');
  if (error) {
    alert('Erreur: ' + error.message);
    return;
  }
  console.log('Edge Function data:', data);
}

callEdgeFunction();
