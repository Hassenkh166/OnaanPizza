document.addEventListener('DOMContentLoaded', function(){
  const specialsList = document.getElementById('specialsList');
  const templatesList = document.getElementById('templatesList');
  const createTplBtn = document.getElementById('createTpl');
  const refreshTplBtn = document.getElementById('refreshTpl');
  const tplTitle = document.getElementById('tplTitle');
  const tplDesc = document.getElementById('tplDesc');
  const tplPrice = document.getElementById('tplPrice');
  const tplImg = document.getElementById('tplImg');
  const tplPreview = document.getElementById('tplPreview');

  // product selection removed: workflow is templates-only

  async function loadSpecials(){
    try{
      const res = await fetch('/api/daily-specials');
      const specials = await res.json();
      specialsList.innerHTML = specials.map(s=> `
        <div class="d-flex align-items-center justify-content-between mb-2 p-2 border rounded" data-id="${s.id}">
          <div class="d-flex align-items-center gap-3">
            <img src="${s.img||'/assets/images/restaurant.jpg'}" style="width:80px;height:56px;object-fit:cover;border-radius:6px">
            <div>
              <div class="fw-bold">${s.title || 'Plat'}</div>
              <div class="small text-muted">${s.note || ''} ${s.price_override ? ' — ' + s.price_override : ''}</div>
            </div>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-secondary move-up">↑</button>
            <button class="btn btn-sm btn-outline-secondary move-down">↓</button>
            <button class="btn btn-sm btn-danger ms-2 remove">Supprimer</button>
          </div>
        </div>
      `).join('');

      specialsList.querySelectorAll('.move-up').forEach(b=>b.addEventListener('click', onMoveUp));
      specialsList.querySelectorAll('.move-down').forEach(b=>b.addEventListener('click', onMoveDown));
      specialsList.querySelectorAll('.remove').forEach(b=>b.addEventListener('click', onRemove));
    }catch(e){ console.error(e); specialsList.innerHTML='Impossible de charger'; }
  }

  // templates (specials) management
  async function loadTemplates(){
    try{
      const res = await fetch('/api/specials'); const t = await res.json();
      templatesList.innerHTML = t.map(item=>`
        <div class="d-flex align-items-center justify-content-between p-2 border-bottom">
          <div class="d-flex align-items-center gap-3">
            <img src="${item.img||'/assets/images/restaurant.jpg'}" style="width:64px;height:44px;object-fit:cover;border-radius:6px">
            <div>
              <div class="fw-bold">${item.title}</div>
              <div class="small text-muted">${item.price || ''}</div>
            </div>
          </div>
          <div>
            <button class="btn btn-sm btn-primary add-template" data-id="${item.id}">Ajouter</button>
            <button class="btn btn-sm btn-outline-secondary ms-1 edit-template" data-id="${item.id}">Éditer</button>
            <button class="btn btn-sm btn-danger ms-1 delete-template" data-id="${item.id}">Suppr</button>
          </div>
        </div>
      `).join('');
      templatesList.querySelectorAll('.add-template').forEach(b=>b.addEventListener('click', async (e)=>{ const id=e.currentTarget.dataset.id; await fetch('/api/daily-specials',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ special_id: id }) }); await loadSpecials(); }));
      templatesList.querySelectorAll('.delete-template').forEach(b=>b.addEventListener('click', async (e)=>{ if (!confirm('Supprimer ce template ?')) return; const id=e.currentTarget.dataset.id; await fetch('/api/specials/'+id,{ method:'DELETE' }); await loadTemplates(); }));
      templatesList.querySelectorAll('.edit-template').forEach(b=>b.addEventListener('click', async (e)=>{ const id=e.currentTarget.dataset.id; // open modal and populate
        try{ const res = await fetch('/api/specials'); const all = await res.json(); const item = all.find(x=>String(x.id)===String(id)); if (!item) return; document.getElementById('editTplTitle').value=item.title||''; document.getElementById('editTplDesc').value=item.description||''; document.getElementById('editTplPrice').value=item.price||''; document.getElementById('editTplPreview').innerHTML=`<img src="${item.img||'/assets/images/restaurant.jpg'}" style="max-width:100%">`; document.getElementById('saveTplEdit').dataset.id = id; new bootstrap.Modal(document.getElementById('editTplModal')).show(); } catch(e){ console.error(e); } }));
    }catch(e){ console.error(e); templatesList.innerHTML='Impossible de charger templates'; }
  }

  async function uploadTplImage(file){
    const fd = new FormData(); fd.append('image', file);
    const r = await fetch('/api/upload', { method: 'POST', body: fd }); const jr = await r.json(); return jr.url;
  }

  createTplBtn.addEventListener('click', async ()=>{
    const title = tplTitle.value.trim(); if (!title) { alert('Titre requis'); return; }
    let imgUrl = '';
    if (tplImg.files && tplImg.files.length) { try { imgUrl = await uploadTplImage(tplImg.files[0]); } catch(e){ console.error(e); alert('Erreur upload'); return; } }
    await fetch('/api/specials', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title, description: tplDesc.value, price: tplPrice.value, img: imgUrl }) });
    tplTitle.value=''; tplDesc.value=''; tplPrice.value=''; tplImg.value=''; tplPreview.innerHTML='';
    await loadTemplates();
  });

  refreshTplBtn.addEventListener('click', loadTemplates);

  tplImg.addEventListener('change', function(){ if (!this.files || !this.files.length) { tplPreview.innerHTML=''; return; } tplPreview.innerHTML = `<img src="${URL.createObjectURL(this.files[0])}" style="max-width:100%">`; });

  // edit modal save
  document.getElementById('saveTplEdit').addEventListener('click', async function(){
    const id = this.dataset.id; if (!id) return;
    const title = document.getElementById('editTplTitle').value.trim();
    const desc = document.getElementById('editTplDesc').value.trim();
    const price = document.getElementById('editTplPrice').value.trim();
    let img = '';
    const fileInput = document.getElementById('editTplImg');
    if (fileInput && fileInput.files && fileInput.files.length) {
      try{ img = await uploadTplImage(fileInput.files[0]); } catch(e){ alert('Erreur upload'); return; }
    }
    try{
      await fetch('/api/specials/'+id, { method:'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title, description: desc, price, img }) });
      bootstrap.Modal.getInstance(document.getElementById('editTplModal')).hide();
      await loadTemplates();
    }catch(e){ console.error(e); alert('Erreur sauvegarde'); }
  });

  document.getElementById('editTplImg').addEventListener('change', function(){ if (!this.files || !this.files.length) { document.getElementById('editTplPreview').innerHTML=''; return; } document.getElementById('editTplPreview').innerHTML = `<img src="${URL.createObjectURL(this.files[0])}" style="max-width:100%">`; });

  async function onMoveUp(e){
    const el = e.currentTarget.closest('[data-id]');
    const id = el.dataset.id; const list = Array.from(specialsList.children);
    const idx = list.findIndex(x=>x.dataset.id===id); if (idx<=0) return;
    // swap orders by fetching all, updating ord values server-side via PUT
    const res = await fetch('/api/daily-specials'); const specials = await res.json();
    // reorder in-memory
    const s = specials.splice(idx,1)[0]; specials.splice(idx-1,0,s);
    // apply new ord
    for (let i=0;i<specials.length;i++){ await fetch('/api/daily-specials/'+specials[i].id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ord: i }) }); }
    await loadSpecials();
  }

  async function onMoveDown(e){
    const el = e.currentTarget.closest('[data-id]');
    const id = el.dataset.id; const list = Array.from(specialsList.children);
    const idx = list.findIndex(x=>x.dataset.id===id); if (idx<0 || idx>=list.length-1) return;
    const res = await fetch('/api/daily-specials'); const specials = await res.json();
    const s = specials.splice(idx,1)[0]; specials.splice(idx+1,0,s);
    for (let i=0;i<specials.length;i++){ await fetch('/api/daily-specials/'+specials[i].id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ord: i }) }); }
    await loadSpecials();
  }

  async function onRemove(e){
    const el = e.currentTarget.closest('[data-id]');
    const id = el.dataset.id; await fetch('/api/daily-specials/'+id, { method:'DELETE' }); await loadSpecials();
  }

  // initial
  loadSpecials(); loadTemplates();
});
