import { supabase,roleKey,FUNCTIONS } from './supabaseClient.js';
import { requireAuth } from './checkAuthentication.js';

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();

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
  const categoryIcon = document.getElementById('categoryIcon');
  const customIconOptions = document.getElementById('customIconOptions');
  const categoryIconFile = document.getElementById('categoryIconFile');
  const editingCategory = document.getElementById('editingCategory');
  const categoryIconPreviewWrap = document.getElementById('categoryIconPreviewWrap');
  const categoryIconPreview = document.getElementById('categoryIconPreview');
  const categoriesList = document.getElementById('categoriesList');
  const fileInput = document.getElementById('productFile');
  const preview = document.getElementById('preview');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn'); 
  const addCatBtn = document.getElementById('addCategory');
  
  // Variables pour le filtre de catégories
  let selectedCategoryId = null;
  let allCategories = []; 
  // site configuration moved to separate page (site-config.html)

  // Gestionnaire pour le lien de déconnexion
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async function(e) {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // Charger toutes les catégories et afficher
async function loadCategories() {
  try {
   const res = await fetch(FUNCTIONS.getCategories, {
     method: 'GET',
     headers: {
       'Content-Type': 'application/json',
       'apikey': roleKey,
       'Authorization': `Bearer ${roleKey}`
     }
   });
    const cats = await res.json();
    allCategories = cats;
    
    // Initialiser avec la première catégorie si non défini
    if (!selectedCategoryId && cats.length > 0) {
      selectedCategoryId = cats[0].id;
    }
    
    categorySelect.innerHTML = '<option value="">Choisir une catégorie</option>' + cats.map(c => {
      const iconHtml = (c.icon && (c.icon.startsWith('http') || c.icon.startsWith('/') || /\.(png|jpe?g|gif|svg)$/i.test(c.icon))) ? ` <img src="${c.icon}" style="height:18px; width:18px; object-fit:contain; margin-right:6px">` : (c.icon? c.icon+' ' : '');
      return `<option value="${c.id}">${iconHtml}${c.name}</option>`;
    }).join('');

    // Mettre à jour la liste avec boutons éditer / supprimer
    categoriesList.innerHTML = cats.map(c => {
      const iconHtml = (c.icon && (c.icon.startsWith('http') || c.icon.startsWith('/') || /\.(png|jpe?g|gif|svg)$/i.test(c.icon))) ? `<img src="${c.icon}" style="height:20px; width:20px; object-fit:contain; margin-right:8px">` : (c.icon? `<span class="me-2">${c.icon}</span>` : '');
      return `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div>${iconHtml}${c.name}</div>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-slug="${c.slug}">Modifier</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-slug="${c.slug}">Supprimer</button>
        </div>
      </div>
    `;
    }).join('');

    // listeners are handled by delegated handler attached below

  } catch(err) {
    console.error(err);
    alert('Impossible de charger les catégories');
  }
}

  async function renderList(){
    const res = await fetch(FUNCTIONS.getProducts, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': roleKey,
        'Authorization': `Bearer ${roleKey}`
      }
    });
    let products = await res.json();
    
    // Filtrer par catégorie sélectionnée
    if (selectedCategoryId) {
      products = products.filter(p => p.category_id === selectedCategoryId);
    }
    
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
          <div class="product-actions">
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

  // Fonction pour afficher le slider de catégories
  function renderCategoryFilters() {
    // Supprimer les anciens filtres s'ils existent
    const oldFilters = document.querySelectorAll('[data-filter-wrapper]');
    oldFilters.forEach(f => f.remove());
    
    let filterHtml = `
      <div data-filter-wrapper style="display: flex; gap: 10px; overflow-x: auto; padding: 16px 0; margin-bottom: 24px; align-items: center;">
    `;
    
    allCategories.forEach(cat => {
      const isActive = cat.id === selectedCategoryId;
      const iconHtml = (cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || /\.(png|jpe?g|gif|svg)$/i.test(cat.icon))) 
        ? `<img src="${cat.icon}" style="height: 20px; width: 20px; object-fit: contain;">` 
        : (cat.icon ? cat.icon : '📁');
      
      filterHtml += `
        <button 
          class="category-filter-btn" 
          data-category-id="${cat.id}"
          style="
            padding: 10px 16px;
            border: 2px solid ${isActive ? '#E53935' : '#ddd'};
            border-radius: 20px;
            background: ${isActive ? '#E53935' : 'white'};
            color: ${isActive ? 'white' : '#333'};
            font-weight: ${isActive ? '600' : '500'};
            cursor: pointer;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.3s;
          "
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
        >
          <span>${iconHtml}</span>
          <span>${cat.name}</span>
        </button>
      `;
    });
    
    filterHtml += `</div>`;
    
    // Insérer le slider avant la liste des produits
    listEl.insertAdjacentHTML('beforebegin', filterHtml);
    
    // Ajouter les listeners pour les filtres
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        selectedCategoryId = parseInt(this.dataset.categoryId);
        await renderList();
        renderCategoryFilters();
      });
    });
  }

  async function onEdit(e){
    const id = e.currentTarget.dataset.id;
    const res = await fetch(FUNCTIONS.getProducts, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': roleKey,
        'Authorization': `Bearer ${roleKey}`
      }
    });
    const products = await res.json();
    const prod = products.find(p => String(p.id) === String(id));
    if (!prod) return;
    idInput.value = prod.id;
    titleInput.value = prod.title;
    priceInput.value = prod.price;
    currentImageUrl = prod.img || '';
    descInput.value = prod.description;
    categorySelect.value = prod.category_id || '';
    saveBtn.textContent = 'Enregistrer les modifications';
    preview.innerHTML = `<img src="${prod.img}" style="max-width:160px; border-radius:8px">`;
    try {
      const prodForm = document.getElementById('productForm');
      if (prodForm && typeof prodForm.scrollIntoView === 'function') prodForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (titleInput && typeof titleInput.focus === 'function') titleInput.focus();
    } catch(e) { /* ignore */ }
    // set IconButtons state according to product flags (is_spicy, is_new, is_popular)
    try {
      const map = { spicy: 'danger', new: 'success', popular: 'warning' };
      ['spicy','new','popular'].forEach(flag => {
        const btn = document.querySelector(`.product-icon-button[data-flag="${flag}"]`);
        if (!btn) return;
        const val = prod[`is_${flag}`] || prod[`is${flag.charAt(0).toUpperCase()+flag.slice(1)}`] || 0;
        const filled = `btn-${map[flag] || 'secondary'}`;
        const outline = `btn-outline-${map[flag] || 'secondary'}`;
        // clear previous classes
        btn.classList.remove('btn-secondary','btn-danger','btn-success','btn-warning');
        if (val && Number(val) === 1) {
          btn.classList.add('active');
          btn.classList.remove(outline);
          btn.classList.add(filled);
        } else {
          btn.classList.remove('active');
          btn.classList.remove(filled);
          if (!btn.classList.contains(outline)) btn.classList.add(outline);
        }
      });
    } catch(e) { /* ignore */ }
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
        const res = await fetch(`${FUNCTIONS.deleteProduct}/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': roleKey,
            'Authorization': `Bearer ${roleKey}`
          }
        });
        if (!res.ok) throw new Error('Échec suppression');
        showToast('Produit supprimé', 'success');
        await renderList();
        renderCategoryFilters();
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
    // reset IconButtons to outlined (non-active) state
    document.querySelectorAll('.product-icon-button').forEach(btn => {
      const flag = btn.dataset.flag;
      const map = { spicy: 'danger', new: 'success', popular: 'warning' };
      const outline = `btn-outline-${map[flag] || 'secondary'}`;
      const filled = `btn-${map[flag] || 'secondary'}`;
      btn.classList.remove('active');
      btn.classList.remove(filled);
      // remove other possible btn-* classes to ensure consistent state
      btn.classList.remove('btn-secondary','btn-danger','btn-success','btn-warning');
      if (!btn.classList.contains(outline)) btn.classList.add(outline);
    });
  }
  
   addCatBtn.addEventListener('click', async function(e){
  e.preventDefault(); 

  const name = newCategory.value.trim();
  if (!name) {
    alert('Veuillez entrer un nom de catégorie.');
    return;
  }

  const slug = name.toLowerCase().replace(/\s+/g,'-');

  // determine icon value (selected or custom upload)
  let icon = '';
  if (categoryIcon) {
    if (categoryIcon.value === 'custom') {
      if (categoryIconFile && categoryIconFile.files && categoryIconFile.files.length) {
        try {
          const f = categoryIconFile.files[0];
          const fd = new FormData(); fd.append('image', f);
          const up = await fetch(FUNCTIONS.upload, { 
            method: 'POST', 
            body: fd,
            headers: {
              'apikey': roleKey,
              'Authorization': `Bearer ${roleKey}`
            }
          });
          if (up.ok) { const jr = await up.json(); icon = jr.url || ''; }
          else { showToast('Erreur téléversement icône', 'danger'); }
        } catch(e) { console.error(e); showToast('Erreur téléversement icône', 'danger'); }
      }
    } else {
      icon = categoryIcon.value || '';
    }
  }

    try {
      let res;
      if (editingCategory && editingCategory.value) {
        // update existing
        const oldSlug = editingCategory.value;
       
       
          // On retire "/pizza" de l'URL pour appeler l'URL exacte de la fonction
res = await fetch(FUNCTIONS.updateCategory, { 
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'apikey': roleKey,
    'Authorization': `Bearer ${roleKey}`
  },
  // On passe oldSlug (qui contient "pizza") dans le body
  body: JSON.stringify({ 
    oldSlug: oldSlug, // ex: "pizza"
    name: name, 
    slug: slug, 
    icon: icon 
  }) 
});
 

      } else {
        // create new
        res = await fetch(`${FUNCTIONS.createCategory}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': roleKey,
            'Authorization': `Bearer ${roleKey}`
          },
          body: JSON.stringify({ name, slug, icon })
        });
      }
      if (!res.ok) { const err = await res.json().catch(()=>({})); showToast(err.error || 'Erreur création/édition catégorie', 'danger'); return; }
      const result = await res.json();
      await loadCategories();
      // auto-select new or updated category using the returned ID
      categorySelect.value = result.id || result.category?.id || '';
      newCategory.value = '';
      if (categoryIconFile) categoryIconFile.value = '';
      if (categoryIcon) categoryIcon.value = '';
      if (editingCategory) editingCategory.value = '';
      if (addCatBtn) addCatBtn.textContent = 'Ajouter';
      categoryIconPreview.src = '';
      categoryIconPreviewWrap.classList.add('d-none');
      showToast('Catégorie enregistrée', 'success');
    } catch(err) { console.error(err); showToast('Erreur réseau', 'danger'); }
});

  // show/hide custom icon options
  if (categoryIcon && customIconOptions) {
    categoryIcon.addEventListener('change', function(){
      if (this.value === 'custom') customIconOptions.classList.remove('d-none');
      else customIconOptions.classList.add('d-none');
    });

    // only upload option is supported for custom icons (file input visible)
  }

  // IconButtons toggle logic: simple outline <-> filled swap
  (function(){
    const map = { spicy: 'danger', new: 'success', popular: 'warning' };
    function toOutlineClass(flag){ return `btn-outline-${map[flag] || 'secondary'}`; }
    function toFilledClass(flag){ return `btn-${map[flag] || 'secondary'}`; }
    document.querySelectorAll('.product-icon-button').forEach(btn => {
      // ensure initial outline state
      const flag = btn.dataset.flag;
      btn.classList.remove('btn-secondary','btn-danger','btn-success','btn-warning');
      if (!btn.classList.contains(toOutlineClass(flag)) && !btn.classList.contains(toFilledClass(flag))) btn.classList.add(toOutlineClass(flag));
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')){
          btn.classList.remove('active');
          btn.classList.remove(toFilledClass(flag));
          btn.classList.add(toOutlineClass(flag));
        } else {
          btn.classList.add('active');
          btn.classList.remove(toOutlineClass(flag));
          btn.classList.add(toFilledClass(flag));
        }
      });
    });
    // reset handler to restore outlines
    const origReset = window.resetForm || null;
    // override resetForm's inner behavior by patching existing function reference
    // (we'll just augment below where resetForm is defined)
  })();


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
        const r = await fetch(FUNCTIONS.upload, { 
          method: 'POST', 
          body: fd,
          headers: {
            'apikey': roleKey,
            'Authorization': `Bearer ${roleKey}`
          }
        });
        const jr = await r.json();
        imageUrl = jr.url;
      }
      // determine final image (either newly uploaded or existing when editing)
      const finalImage = imageUrl || currentImageUrl || '';
      // collect simple badge flags from IconButtons (active = filled)
      const getFlag = (flag) => {
        const b = document.querySelector(`.product-icon-button[data-flag="${flag}"]`);
        return b && b.classList.contains('active') ? 1 : 0;
      };
      // validate required fields: title, price, description, image
      const titleVal = titleInput.value.trim();
      const priceVal = priceInput.value.trim();
      const descVal = descInput.value.trim();
      if (!titleVal || !priceVal || !descVal || !finalImage) {
        showToast('Veuillez renseigner le titre, le prix, la description et une image.', 'danger');
        saveBtn.disabled = false;
        return;
      }
      const payload = { 
        title: titleVal, 
        price: priceVal, 
        img: finalImage, 
        description: descVal, 
        category_id: categorySelect.value,
        is_spicy: getFlag('spicy'),
        is_new: getFlag('new'),
        is_popular: getFlag('popular')
      };
      console.log(" aaa ajouter" + payload);
      let res;
      if (idVal) {
        res = await fetch(`${FUNCTIONS.updateProduct}/${idVal}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': roleKey,
            'Authorization': `Bearer ${roleKey}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(FUNCTIONS.createProduct, { 
          method: 'POST', 
          headers: {
            'Content-Type':'application/json',
            'apikey': roleKey,
            'Authorization': `Bearer ${roleKey}`
          }, 
          body: JSON.stringify(payload) 
        });
      }
      if (!res.ok) { showToast('Erreur enregistrement', 'danger'); }
      else { showToast('Produit enregistré', 'success'); }
      resetForm();
      await renderList();
      renderCategoryFilters();
      try { window.opener && window.opener.__Products && window.opener.__Products.renderProducts(); } catch(e){}
    } catch(err) { console.error(err); showToast('Erreur réseau', 'danger'); }
    finally { saveBtn.disabled = false; }
  });

  resetBtn.addEventListener('click', function(){ resetForm(); });

  // initial load
  loadCategories().then(renderList).then(renderCategoryFilters).catch(err => { console.error(err); renderList(); renderCategoryFilters(); });

  // delegated handler for edit/delete on categories list (more robust)
  if (categoriesList) {
    categoriesList.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const slug = btn.dataset.slug;
      if (action === 'delete') {
        if (!confirm('Supprimer cette catégorie ?')) return;
        try {
          const delRes = await fetch(`${FUNCTIONS.deleteCategory}/${slug}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'apikey': roleKey,
              'Authorization': `Bearer ${roleKey}`
            }
          });
          if (!delRes.ok) {
            const err = await delRes.json().catch(()=>({}));
            showToast(err.error || 'Erreur suppression catégorie', 'danger');
          } else {
            await loadCategories();
            showToast('Catégorie supprimée', 'success');
          }
        } catch(err) { console.error(err); showToast('Erreur réseau', 'danger'); }
      } else if (action === 'edit') {
        try {
          const res = await fetch(FUNCTIONS.getCategories, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': roleKey,
              'Authorization': `Bearer ${roleKey}`
            }
          });
          const cats = await res.json();
          const cat = cats.find(c => c.slug === slug);
          if (!cat) return;
          newCategory.value = cat.name;
          editingCategory.value = cat.slug;
          const optionExists = Array.from(categoryIcon.options).some(o => o.value === (cat.icon || ''));
          if (cat.icon && optionExists) {
            categoryIcon.value = cat.icon;
            customIconOptions.classList.add('d-none');
            categoryIconPreviewWrap.classList.add('d-none');
          } else if (cat.icon) {
            categoryIcon.value = 'custom';
            customIconOptions.classList.remove('d-none');
            if (cat.icon.startsWith('http') || cat.icon.startsWith('/') || /\.(png|jpe?g|gif|svg)$/i.test(cat.icon)) {
              categoryIconPreview.src = cat.icon;
              categoryIconPreviewWrap.classList.remove('d-none');
            } else {
              categoryIconPreview.src = '';
              categoryIconPreviewWrap.classList.add('d-none');
            }
          } else {
            categoryIcon.value = '';
            customIconOptions.classList.add('d-none');
            categoryIconPreviewWrap.classList.add('d-none');
          }
          addCatBtn.textContent = 'Enregistrer';
          // scroll the category form into view and focus the input so the admin doesn't have to scroll manually
          try {
            const catForm = document.getElementById('categoryForm');
            if (catForm && typeof catForm.scrollIntoView === 'function') catForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (newCategory && typeof newCategory.focus === 'function') newCategory.focus();
          } catch(e) { /* ignore scroll errors */ }
        } catch(err) { console.error(err); showToast('Erreur chargement catégorie', 'danger'); }
      }
    });
  }

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

  // preview selected category icon file to avoid 404 when previewing before upload
  if (categoryIconFile && categoryIconPreview) {
    categoryIconFile.addEventListener('change', function(){
      const f = this.files[0];
      if (!f) { categoryIconPreview.src = ''; categoryIconPreviewWrap.classList.add('d-none'); return; }
      const url = URL.createObjectURL(f);
      categoryIconPreview.src = url;
      categoryIconPreviewWrap.classList.remove('d-none');
      // revoke objectURL after image loads to free memory
      categoryIconPreview.onload = () => { URL.revokeObjectURL(url); };
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

  // Fonctions d'authentification
  // plus de checkAuthentication, tout est géré par requireAuth
  initializeAdmin();

  async function logout() {
    if (window.supabase && window.supabase.auth) {
      await window.supabase.auth.signOut();
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token_exp');
    window.location.href = 'login.html';
  }

  function initializeAdmin() {
    // Code d'initialisation existant
    loadCategories();
    renderList();
  }
});
