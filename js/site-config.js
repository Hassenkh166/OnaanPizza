import { supabase,supabaseKey,FUNCTIONS } from './supabaseClient.js';
import { requireAuth } from './checkAuthentication.js';

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();

  // Gestionnaire pour le lien de déconnexion
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async function(e) {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // Contact info (seulement téléphone et horaires)
  const contactPhone = document.getElementById('contactPhone');
  const contactHours = document.getElementById('contactHours');

  // Save buttons
  const saveConfig = document.getElementById('saveConfig');
  const resetConfig = document.getElementById('resetConfig');

  let currentConfig = {};

  async function loadConfiguration() {
    try {
      // Show loading toast
      showToast('Chargement de la configuration...', 'info', 0);

      // --- Fetch configuration from Supabase Edge Function ---
      const res = await fetch(FUNCTIONS.getConfig, {
        method: 'GET',
        headers: {
          apikey: supabaseKey, 
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

      const data = await res.json();
      currentConfig = data;
      console.log('Configuration reçue:', currentConfig);

      // --- Populate form fields ---
      const fields = [
        { el: contactPhone, value: currentConfig.contact_phone },
        { el: contactHours, value: currentConfig.contact_hours },
      ];

      fields.forEach(f => {
        if (f.el) {
          f.el.value = f.value || '';
          f.el.disabled = false;
        }
      });

      // --- Remove loading toast and show success ---
      document.querySelectorAll('.toast').forEach(toast => {
        if (toast.querySelector('.toast-body')?.textContent?.includes('Chargement')) {
          toast.remove();
        }
      });
      showToast('Configuration chargée avec succès', 'success');

    } catch (e) {
      console.error('Erreur lors du chargement de la configuration:', e);
      showToast('Erreur lors du chargement de la configuration', 'danger');
    }
  }

  // Save all configuration
  if (saveConfig) saveConfig.addEventListener('click', async ()=>{
    try{
      const configData = {
        contact_phone: contactPhone.value,
        contact_hours: contactHours.value,
      };
      
      const res = await fetch(FUNCTIONS.updateConfig, { 
        method: 'POST', 
        headers: {'Content-Type':'application/json', 'apikey': supabaseKey}, 
        body: JSON.stringify(configData) 
      });
      
      if (!res.ok) { 
        showToast('Erreur sauvegarde configuration','danger'); 
      } else { 
        showToast('Configuration sauvegardée avec succès','success');
        // Reload to get updated config
        await loadConfiguration();
      }
    }catch(e){ 
      console.error(e); 
      showToast('Erreur réseau','danger'); 
    }
  });

  // Reset configuration
  if (resetConfig) resetConfig.addEventListener('click', async ()=>{
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser la configuration ?')) return;
    try{
      // Reset to defaults (seulement téléphone et horaires)
      const defaults = {
        contact_phone: '01 89 46 58 49',
        contact_hours: '7/7j 10h-00h',
      };
      
      const res = await fetch(FUNCTIONS.updateConfig, { 
        method: 'POST', 
        headers: {'Content-Type':'application/json', 'apikey': supabaseKey}, 
        body: JSON.stringify(defaults) 
      });
      
      if (!res.ok) { 
        showToast('Erreur réinitialisation','danger'); 
      } else { 
        showToast('Configuration réinitialisée','success');
        await loadConfiguration();
      }
    }catch(e){ 
      console.error(e); 
      showToast('Erreur réseau','danger'); 
    }
  });

  // toast helper
  function showToast(message, type='info', delay=3000){
    const id = 't'+Date.now();
    const html = `
      <div id="${id}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`;
    const container = document.getElementById('toastContainer');
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    const t = new bootstrap.Toast(el, { delay: delay });
    t.show();
    el.addEventListener('hidden.bs.toast', ()=> el.remove());
  }

  // Initialisation
  loadConfiguration();
});
