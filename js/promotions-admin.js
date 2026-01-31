// Admin: Gestion des promotions (CRUD basique)

import { supabase , FUNCTIONS , roleKey} from './supabaseClient.js';
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

  const listEl = document.getElementById('promotionsList');
  const form = document.getElementById('promoForm');
  const promoId = document.getElementById('promoId');
  const promoTitle = document.getElementById('promoTitle');
  const promoSubtitle = document.getElementById('promoSubtitle');
  const promoBadge = document.getElementById('promoBadge');
  const promoImage = document.getElementById('promoImage');
  const promoPreview = document.getElementById('promoPreview');
  const refreshBtn = document.getElementById('refreshPromos');
  const resetBtn = document.getElementById('resetPromo');

  async function uploadImage(file){
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(FUNCTIONS.upload, {
      method:'POST',
      headers: { 'apikey': roleKey },
      body: fd
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  }

  function renderPreview(url){
    promoPreview.innerHTML = url ? `<img src="${url}" style="max-width:120px;border-radius:8px">` : '';
  }

  function resetForm(){
    promoId.value = '';
    promoTitle.value = '';
    promoSubtitle.value = '';
    promoBadge.value = '';
    promoImage.value = '';
    renderPreview('');
  }

  async function loadPromotions(){
    listEl.innerHTML = '<div class="text-muted">Chargement...</div>';
    try{

         const res = await fetch(FUNCTIONS.promotions, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'apikey': roleKey, 
                'Authorization': `Bearer ${roleKey}`
              },
            });
        
              if (!res.ok) {
                console.error('Erreur HTTP', res.status, res.statusText);
                const errBody = await res.text();
                console.error('Body:', errBody);
                return;
              }
              const data = await res.json();
              const promos = data ;
      
      if (!promos.length){
        listEl.innerHTML = '<div class="text-muted">Aucune promotion pour le moment</div>';
        return;
      }
      listEl.innerHTML = promos.map(p => `
        <div class="list-group-item" data-id="${p.id}">
          <div class="d-flex align-items-center gap-3">
            <img src="${p.image_url || '/assets/images/restaurant.jpg'}" class="promo-thumb" alt="promo">
            <div>
              <div class="fw-bold">${p.title || ''}</div>
              <div class="text-muted small">${p.subtitle || ''}</div>
              ${p.badge_text ? `<span class="badge bg-danger mt-1">${p.badge_text}</span>` : ''}
            </div>
          </div>
          <div class="btn-group mt-3 w-100 d-flex justify-content-center">
            <button class="btn btn-sm btn-outline-secondary edit-promo">Éditer</button>
            <button class="btn btn-sm btn-danger delete-promo">Supprimer</button>
          </div>
        </div>
      `).join('');
      const promoItems = listEl.querySelectorAll('.list-group-item');
      promoItems.forEach((item, index) => {
        const p = promos[index];
        item.querySelector('.edit-promo').addEventListener('click', () => onEdit(p));
        item.querySelector('.delete-promo').addEventListener('click', () => onDelete(p.id));
      });
    }catch(e){
      console.error(e);
      listEl.innerHTML = '<div class="text-danger">Erreur de chargement</div>';
    }
  }

  function onEdit(p){
    promoId.value = p.id;
    promoTitle.value = p.title || '';
    promoSubtitle.value = p.subtitle || '';
    promoBadge.value = p.badge_text || '';
    renderPreview(p.image_url || '');
  }

  async function onDelete(id){
    if (!confirm('Supprimer cette promotion ?')) return;
    try{
      const res = await fetch(FUNCTIONS.deletePromotion, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Delete failed');
      await loadPromotions();
    }catch(err){
      console.error(err);
      alert('Suppression échouée');
    }
  }

  promoImage.addEventListener('change', () => {
    const file = promoImage.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      renderPreview(url);
    } else {
      renderPreview('');
    }
  });

  resetBtn.addEventListener('click', resetForm);
  refreshBtn.addEventListener('click', loadPromotions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = promoTitle.value.trim();
    const subtitle = promoSubtitle.value.trim();
    if (!title || !subtitle) { alert('Titre et sous-titre requis'); return; }

    let imageUrl = promoPreview.querySelector('img')?.src || '';
    const file = promoImage.files?.[0];
    try{
      if (file) {
        imageUrl = await uploadImage(file);
      }
      const payload = {
        title,
        subtitle,
        badge_text: promoBadge.value.trim(),
        image_url: imageUrl
      };
      const id = promoId.value;
      let res;
      if (id) {
        // Update existing promotion
     res = await fetch(FUNCTIONS.updatePromotion, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'apikey': roleKey // Ajoute cette ligne !
  },
  body: JSON.stringify({ id, ...payload })
});
      } else {
        // Create new promotion
        res = await fetch(FUNCTIONS.promotions, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) throw new Error('Save failed');
      resetForm();
      await loadPromotions();
    }catch(err){
      console.error(err);
      alert('Enregistrement échoué');
    }
  });

  // Fonctions d'authentification
  // plus de checkAuthentication, tout est géré par requireAuth

  function initializePromotions() {
    // Code d'initialisation existant
    resetForm();
    loadPromotions();
  }

  // Initialisation après auth
  initializePromotions();
});
