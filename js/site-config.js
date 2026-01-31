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

  // Hero images
  const heroFile = document.getElementById('heroFile');
  const heroList = document.getElementById('heroList');
  const saveHero = document.getElementById('saveHero');
  let heroImages = [];

  // General info
  const restaurantName = document.getElementById('restaurantName');
  const logoFile = document.getElementById('logoFile');
  const currentLogo = document.getElementById('currentLogo');

  // Contact info
  const contactAddress = document.getElementById('contactAddress');
  const contactPhone = document.getElementById('contactPhone');
  const contactEmail = document.getElementById('contactEmail');
  const contactHours = document.getElementById('contactHours');

  // Save buttons
  const saveConfig = document.getElementById('saveConfig');
  const resetConfig = document.getElementById('resetConfig');
  const debugConfig = document.getElementById('debugConfig');

  // Debug: check if elements are found
  console.log('Éléments DOM trouvés:', {
    restaurantName: !!restaurantName,
    contactAddress: !!contactAddress
  });

  let currentConfig = {};

  async function loadConfiguration() {
  try {
    // Show loading toast
    const loadingToastId = 'loading-' + Date.now();
    showToast('Chargement de la configuration...', 'info', 0); // 0 = no auto-hide

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

    // --- Normalize hero images ---
     let rawHeroImages = currentConfig.hero_images;

    // Cas 1 : string JSON depuis la DB
    if (typeof rawHeroImages === 'string') {
      try {
        rawHeroImages = JSON.parse(rawHeroImages);
      } catch {
        rawHeroImages = [];
      }
    }

    // Cas 2 : pas un tableau → on sécurise
    if (!Array.isArray(rawHeroImages)) {
      rawHeroImages = [];
    }

    heroImages = rawHeroImages
      .map(img => {
        if (!img) return null;
        if (typeof img === 'string') return { path: img };
        if (typeof img === 'object' && img.path) return img;
        return null;
      })
      .filter(Boolean);

    // --- Populate form fields ---
    const fields = [
      { el: restaurantName, value: currentConfig.restaurant_name },
      { el: contactAddress, value: currentConfig.contact_address },
      { el: contactPhone, value: currentConfig.contact_phone },
      { el: contactEmail, value: currentConfig.contact_email },
      { el: contactHours, value: currentConfig.contact_hours },
    ];

    fields.forEach(f => {
      if (f.el) {
        f.el.value = f.value || '';
        f.el.disabled = false;
      }
    });

    // --- Show current logo ---
    if (currentLogo && currentConfig.logo) {
      currentLogo.innerHTML = `<img src="${currentConfig.logo}" style="max-width:100px; max-height:100px;" alt="Logo actuel">`;
    }
    if (logoFile) logoFile.disabled = false;

    // --- Render hero images list ---
    renderHeroList();

    // --- Remove loading toast and show success ---
    document.querySelectorAll('.toast').forEach(toast => {
      if (toast.querySelector('.toast-body')?.textContent?.includes('Chargement')) {
        toast.remove();
      }
    });
    showToast('Configuration chargée avec succès', 'success');

    // --- Debug: check values ---
    setTimeout(() => {
      console.log('Vérification des champs:');
      console.log('Restaurant name:', restaurantName?.value);
      console.log('Contact address:', contactAddress?.value);
    }, 500);

  } catch (e) {
    console.error('Erreur lors du chargement de la configuration:', e);
    showToast('Erreur lors du chargement de la configuration', 'danger');
  }
}


  function renderHeroList(){
    heroList.innerHTML = heroImages.map((h, idx) => {
      const p = (h && h.path) ? h.path : '';
      const isVideo = /\.(mp4|webm)$/i.test(p);
      const previewElement = isVideo
        ? `<video src="${p}" style="width:120px;height:70px;object-fit:cover;border-radius:6px;margin-right:10px" muted loop></video>`
        : `<img src="${p}" style="width:120px;height:70px;object-fit:cover;border-radius:6px;margin-right:10px">`;
      return `
      <div class="d-flex align-items-center mb-2" data-idx="${idx}">
        ${previewElement}
        <div class="flex-fill">
          <div class="hero-path-ellipsis" title="${p}">${p}</div>
        </div>
        <div class="btn-group ms-2">
          <button class="btn btn-sm btn-outline-secondary move-up" ${idx===0? 'disabled':''}>↑</button>
          <button class="btn btn-sm btn-outline-secondary move-down" ${idx===heroImages.length-1? 'disabled':''}>↓</button>
          <button class="btn btn-sm btn-outline-danger ms-2 remove">Supprimer</button>
        </div>
      </div>
    `;
    }).join('');
    heroList.querySelectorAll('.move-up').forEach(b => b.addEventListener('click', onMoveUp));
    heroList.querySelectorAll('.move-down').forEach(b => b.addEventListener('click', onMoveDown));
    heroList.querySelectorAll('.remove').forEach(b => b.addEventListener('click', onRemoveHero));
  }

  function onMoveUp(e){
    const idx = Number(e.currentTarget.closest('[data-idx]').dataset.idx);
    if (idx<=0) return; [heroImages[idx-1], heroImages[idx]] = [heroImages[idx], heroImages[idx-1]]; renderHeroList();
    saveHeroImages();
  }
  function onMoveDown(e){
    const idx = Number(e.currentTarget.closest('[data-idx]').dataset.idx);
    if (idx>=heroImages.length-1) return; [heroImages[idx+1], heroImages[idx]] = [heroImages[idx], heroImages[idx+1]]; renderHeroList();
    saveHeroImages();
  }
  function onRemoveHero(e){
    const idx = Number(e.currentTarget.closest('[data-idx]').dataset.idx);
    heroImages.splice(idx,1); renderHeroList();
    saveHeroImages();
  }

  // upload new hero files and append to list
  if (heroFile) heroFile.addEventListener('change', async function(){
    if (!this.files || !this.files.length) return;
    saveHero.disabled = true;
    for (let f of Array.from(this.files)){
      const fd = new FormData(); fd.append('image', f);
      try{
        const r = await fetch(FUNCTIONS.upload, { 
          method: 'POST', 
          headers: { 'apikey': supabaseKey },
          body: fd 
        });
        const jr = await r.json();
        heroImages.push({ path: jr.url });
      }catch(err){ console.error(err); showToast('Erreur upload image', 'danger'); }
    }
    renderHeroList();
    heroFile.value = '';
    saveHero.disabled = false;
    // persist immediately after uploaded images appended
    saveHeroImages();
  });

  if (saveHero) saveHero.addEventListener('click', async ()=>{
    try{
      const images = heroImages.map(h => h.path);
      console.log('Saving hero images:', images);
      const res = await fetch(FUNCTIONS.updateConfig, { method: 'POST', headers: {'Content-Type':'application/json', 'apikey': supabaseKey}, body: JSON.stringify({ hero_images: images }) });
      console.log('Save response status:', res.status);
      if (!res.ok) { 
        const errorText = await res.text();
        console.error('Save error response:', errorText);
        showToast('Erreur sauvegarde diaporama','danger'); 
      }
      else { showToast('Diaporama sauvegardé','success'); }
    }catch(e){ 
      console.error('Save hero error:', e);
      showToast('Erreur réseau','danger'); 
    }
  });

  async function saveHeroImages(){
    try{
      const images = heroImages.map(h => h.path);
      const res = await fetch(FUNCTIONS.updateConfig, { method: 'POST', headers: {'Content-Type':'application/json', 'apikey': supabaseKey}, body: JSON.stringify({ hero_images: images }) });
      if (!res.ok) { showToast('Erreur sauvegarde diaporama','danger'); }
      else { showToast('Diaporama mis à jour','success'); }
    }catch(e){ console.error(e); showToast('Erreur réseau','danger'); }
  }

  // Logo upload
  if (logoFile) logoFile.addEventListener('change', async function(){
    if (!this.files || !this.files.length) return;
    const fd = new FormData(); 
    fd.append('image', this.files[0]);
    try{
      const r = await fetch(FUNCTIONS.upload, { 
        method: 'POST', 
        headers: { 'apikey': supabaseKey },
        body: fd 
      });
      const jr = await r.json();
      currentConfig.logo = jr.url;
      currentLogo.innerHTML = `<img src="${jr.url}" style="max-width:100px;max-height:100px;" alt="Nouveau logo">`;
      showToast('Logo mis à jour','success');
      // Persist logo immediately so client sees it without requiring manual "Enregistrer"
      try {
        const payload = { logo: currentConfig.logo, hero_images: heroImages.map(h => h.path) };
        const saveRes = await fetch(FUNCTIONS.updateConfig, { method: 'POST', headers: {'Content-Type':'application/json', 'apikey': supabaseKey}, body: JSON.stringify(payload) });
        if (!saveRes.ok) {
          console.warn('Auto-save logo failed', await saveRes.text());
          showToast('Échec sauvegarde automatique du logo','warning');
        } else {
          showToast('Logo enregistré','success');
        }
      } catch (e) {
        console.error('Auto-save logo error', e);
      }
    }catch(err){ 
      console.error(err); 
      showToast('Erreur upload logo', 'danger'); 
    }
    logoFile.value = '';
  });

  // Save all configuration
  if (saveConfig) saveConfig.addEventListener('click', async ()=>{
    try{
      const configData = {
        restaurant_name: restaurantName.value,
        contact_address: contactAddress.value,
        contact_phone: contactPhone.value,
        contact_email: contactEmail.value,
        contact_hours: contactHours.value,
        logo: currentConfig.logo,
        hero_images: heroImages.map(h => h.path) // Include hero images
      };
      
      const res = await fetch(FUNCTIONS.updateConfig, { 
        method: 'POST', 
        headers: {'Content-Type':'application/json', 'apikey': supabaseKey}, 
        body: JSON.stringify(configData) 
      });
      
      if (!res.ok) { 
        showToast('Erreur sauvegarde configuration','danger'); 
      } else { 
        showToast('Configuration sauvegardée','success');
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
      // Reset to defaults
      const defaults = {
        restaurant_name: 'O\'naan Pizza',
        contact_address: '9 Rue Charles Schmidt, 93400 Saint-Ouen-sur-Seine',
        contact_phone: '01 89 46 58 49',
        contact_email: 'contact@onaanpizza.fr',
        contact_hours: '7/7j 10h-00h',
        logo: '/assets/images/logo.png',
        hero_images: [] // Reset hero images to empty
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

  // Debug button
  if (debugConfig) debugConfig.addEventListener('click', () => {
    const debugInfo = `
Configuration actuelle:
- Nom restaurant: ${currentConfig.restaurant_name || 'Non défini'}
- Logo: ${currentConfig.logo || 'Non défini'}
- Couleur primaire: ${currentConfig.primary_color || 'Non défini'}
- Couleur secondaire: ${currentConfig.secondary_color || 'Non défini'}
- Couleur accent: ${currentConfig.accent_color || 'Non défini'}
- Adresse: ${currentConfig.contact_address || 'Non défini'}
- Téléphone: ${currentConfig.contact_phone || 'Non défini'}
- Email: ${currentConfig.contact_email || 'Non défini'}
- Horaires: ${currentConfig.contact_hours || 'Non défini'}
- Images hero: ${heroImages.length} image(s)
    `;
    alert(debugInfo);
  });

  // toast helper (copied from admin.js)
  // toast helper (copied from admin.js)
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

  // Fonctions d'authentification
// plus de checkAuthentication, tout est géré par requireAuth
  // Initialisation du site config après auth
  loadConfiguration();
});
