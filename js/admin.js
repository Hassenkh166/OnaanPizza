document.addEventListener('DOMContentLoaded', function(){
  const listEl = document.getElementById('productsList');
  const form = document.getElementById('productForm');
  const idInput = document.getElementById('productId');
  const titleInput = document.getElementById('productTitle');
  const priceInput = document.getElementById('productPrice');
  // image URL input removed; use file upload only
  let currentImageUrl = '';
  const descInput = document.getElementById('productDesc');
  const categorySelect = document.getElementById('productCategory');
  const newCategory = document.getElementById('categoryName');
  const categoriesList = document.getElementById('categoriesList');
  const fileInput = document.getElementById('productFile');
  const preview = document.getElementById('preview');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn'); 
  const addCatBtn = document.getElementById('addCategory'); 
  // site configuration moved to separate page (site-config.html)

  /*async function loadCategories(){
    const res = await fetch('/api/categories');
    const cats = await res.json();
    categorySelect.innerHTML = '<option value="">Choisir une catégorie</option>' + cats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
  }*/
  // Charger toutes les catégories et afficher
async function loadCategories() {
  try {
   const res = await fetch('/api/categories');
    const cats = await res.json();
    categorySelect.innerHTML = '<option value="">Choisir une catégorie</option>' + cats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');

    // Mettre à jour la liste avec boutons supprimer
    categoriesList.innerHTML = cats.map(c => `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        ${c.name}
        <button class="btn btn-sm btn-outline-danger" data-slug="${c.slug}">Supprimer</button>
      </div>
    `).join('');

    // Ajouter les listeners pour supprimer
    categoriesList.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!confirm('Supprimer cette catégorie ?')) return;
        const slug = this.dataset.slug;
        const delRes = await fetch(`/api/categories/${slug}`, { method: 'DELETE' });
        if (!delRes.ok) {
          const err = await delRes.json();
          alert('Erreur: ' + (err.error || 'Erreur inconnue'));
        } else {
          await loadCategories();
          alert('Catégorie supprimée avec succès.');
        }
      });
    });

  } catch(err) {
    console.error(err);
    alert('Impossible de charger les catégories');
  }
}

  async function renderList(){
    const res = await fetch('/api/products');
    const products = await res.json();
    listEl.innerHTML = products.map(p => {
      return `
        <div class="list-group-item product-row d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-3">
            <img src="${p.img}" alt="${p.title}" width="80" height="60" style="object-fit:cover;border-radius:8px">
            <div>
              <div class="fw-bold">${p.title}</div>
              <div class="text-muted small">${p.price} — ${p.description}</div>
            </div>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${p.id}">Modifier</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${p.id}">Supprimer</button>
          </div>
        </div>
      `;
    }).join('');

    // attach handlers
    listEl.querySelectorAll('button[data-action=edit]').forEach(b => b.addEventListener('click', onEdit));
    listEl.querySelectorAll('button[data-action=delete]').forEach(b => b.addEventListener('click', onDelete));
  }

  async function onEdit(e){
    const id = e.currentTarget.dataset.id;
    const res = await fetch(`/api/products`);
    const products = await res.json();
    const prod = products.find(p => String(p.id) === String(id));
    if (!prod) return;
    idInput.value = prod.id;
    titleInput.value = prod.title;
    priceInput.value = prod.price;
    currentImageUrl = prod.img || '';
    descInput.value = prod.description;
    categorySelect.value = prod.category_slug || '';
    saveBtn.textContent = 'Enregistrer les modifications';
    preview.innerHTML = `<img src="${prod.img}" style="max-width:160px; border-radius:8px">`;
  }

  async function onDelete(e){
    // show modal confirmation
    const id = e.currentTarget.dataset.id;
    const confirmModalEl = document.getElementById('confirmModal');
    const confirmModal = new bootstrap.Modal(confirmModalEl);
    confirmModal.show();
    const btn = document.getElementById('confirmDeleteBtn');
    const handler = async () => {
      btn.removeEventListener('click', handler);
      confirmModal.hide();
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Échec suppression');
        showToast('Produit supprimé', 'success');
        await renderList();
        try { window.opener && window.opener.__Products && window.opener.__Products.renderProducts(); } catch(e){}
      } catch(err) { showToast('Erreur lors de la suppression', 'danger'); }
    };
    btn.addEventListener('click', handler);
  }

  function resetForm(){
    idInput.value = '';
    titleInput.value = '';
    priceInput.value = '';
    descInput.value = '';
    categorySelect.value = '';
    saveBtn.textContent = 'Ajouter / Enregistrer';
    preview.innerHTML = '';
    if (fileInput) { fileInput.value = ''; }
    currentImageUrl = '';
  }
  
   addCatBtn.addEventListener('click', async function(e){
  e.preventDefault(); 

  const name = newCategory.value.trim();
  if (!name) {
    alert('Veuillez entrer un nom de catégorie.');
    return;
  }

  const slug = name.toLowerCase().replace(/\s+/g,'-');

    try {
      const res = await fetch('/api/categories', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, slug }) });
      if (!res.ok) { const err = await res.json().catch(()=>({})); showToast('Erreur création catégorie', 'danger'); return; }
      await loadCategories();
      // auto-select new category
      categorySelect.value = slug;
      newCategory.value = '';
      showToast('Catégorie ajoutée', 'success');
    } catch(err) { console.error(err); showToast('Erreur réseau', 'danger'); }
});


  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const idVal = idInput.value;
    let imageUrl = currentImageUrl;
    // if file selected, upload it
    try {
      saveBtn.disabled = true;
      if (fileInput && fileInput.files && fileInput.files.length) {
        const f = fileInput.files[0];
        const fd = new FormData(); fd.append('image', f);
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const jr = await r.json();
        imageUrl = jr.url;
      }
      const payload = { title: titleInput.value.trim() || 'Sans titre', price: priceInput.value.trim() || '', img: imageUrl || '/assets/images/restaurant.jpg', description: descInput.value.trim(), category_slug: categorySelect.value };
      let res;
      if (idVal) res = await fetch(`/api/products/${idVal}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      else res = await fetch('/api/products', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) { showToast('Erreur enregistrement', 'danger'); }
      else { showToast('Produit enregistré', 'success'); }
      resetForm();
      await renderList();
      try { window.opener && window.opener.__Products && window.opener.__Products.renderProducts(); } catch(e){}
    } catch(err) { console.error(err); showToast('Erreur réseau', 'danger'); }
    finally { saveBtn.disabled = false; }
  });

  resetBtn.addEventListener('click', function(){ resetForm(); });

  // initial load
  loadCategories().then(renderList).catch(err => { console.error(err); renderList(); });

  // site configuration moved to site-config.html (see js/site-config.js)

  // preview selected file
  if (fileInput) {
    fileInput.addEventListener('change', function(){
      const f = this.files[0];
      if (!f) { preview.innerHTML = ''; return; }
      const url = URL.createObjectURL(f);
      preview.innerHTML = `<img src="${url}" style="max-width:160px; border-radius:8px">`;
    });
  }

  // toast helper
  function showToast(message, type='info'){
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
    const t = new bootstrap.Toast(el, { delay: 3000 });
    t.show();
    el.addEventListener('hidden.bs.toast', ()=> el.remove());
  }
});
