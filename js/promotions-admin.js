// Admin: Gestion des promotions (CRUD basique)

document.addEventListener('DOMContentLoaded', () => {
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
    const res = await fetch('/api/upload', { method:'POST', body: fd });
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
      const res = await fetch('/api/promotions');
      const promos = await res.json();
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
      listEl.querySelectorAll('.edit-promo').forEach(btn => btn.addEventListener('click', onEdit));
      listEl.querySelectorAll('.delete-promo').forEach(btn => btn.addEventListener('click', onDelete));
    }catch(e){
      console.error(e);
      listEl.innerHTML = '<div class="text-danger">Erreur de chargement</div>';
    }
  }

  async function onEdit(e){
    const id = e.currentTarget.closest('[data-id]').dataset.id;
    try{
      const res = await fetch(`/api/promotions/${id}`);
      if (!res.ok) throw new Error('Not found');
      const p = await res.json();
      promoId.value = p.id;
      promoTitle.value = p.title || '';
      promoSubtitle.value = p.subtitle || '';
      promoBadge.value = p.badge_text || '';
      renderPreview(p.image_url || '');
    }catch(err){
      console.error(err);
      alert('Impossible de charger cette promotion');
    }
  }

  async function onDelete(e){
    const id = e.currentTarget.closest('[data-id]').dataset.id;
    if (!confirm('Supprimer cette promotion ?')) return;
    try{
      const res = await fetch(`/api/promotions/${id}`, { method:'DELETE' });
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
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/promotions/${id}` : '/api/promotions';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      resetForm();
      await loadPromotions();
    }catch(err){
      console.error(err);
      alert('Enregistrement échoué');
    }
  });

  resetForm();
  loadPromotions();
});
