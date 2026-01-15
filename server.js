const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
try { require('dotenv').config(); } catch(e) { /* ignore */ }
const fetch = require('node-fetch');




// Supabase client - REQUIRED
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_KEY must be set. Exiting.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// Cache côté serveur pour /api/config (TTL 5 min)
let cachedConfig = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Multer memory storage for direct upload to Supabase Storage
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';

// Helpers
function handleSupabaseResult(res, data, error) {
  if (error) {
    console.error('Supabase error', error);
    return res.status(500).json({ error: error.message || 'Supabase error' });
  }
  return res.json(data || []);
}

// Parse possibly double-JSON-stringified values into JS values
function parseLenientJson(value) {
  let v = value;
  for (let i = 0; i < 4; i++) {
    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch (e) { break; }
    } else break;
  }
  return v;
}

// Remove a file from Supabase Storage given a public URL (returns true if removed)
async function removeStorageFile(url) {
  if (!url || typeof url !== 'string') return false;
  const baseStoragePrefix = SUPABASE_URL.replace(/\/$/, '') + `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  if (url.indexOf(baseStoragePrefix) === -1) return false; // not our storage URL
  const parts = url.split('/');
  const filename = decodeURIComponent(parts[parts.length - 1] || '');
  if (!filename) return false;

  const maxAttempts = 3;
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filename]);
      try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] REMOVE_ATTEMPT ${filename} attempt=${attempt} ${error? 'ERR:'+String(error) : 'OK'}\n`); } catch(e){}
      if (!error) return true;
      // if error present, fall through to retry
      console.warn(`removeStorageFile attempt ${attempt} error`, error);
    } catch (e) {
      try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] REMOVE_EXCEPTION ${filename} attempt=${attempt} ${String(e)}\n`); } catch(err){}
      console.warn('removeStorageFile exception', e && e.message);
    }
    // backoff
    await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt-1)));
  }
  return false;
}

// Upload endpoint - uploads to Supabase Storage and returns public URL
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.warn('Upload called without file');
      return res.status(400).json({ error: 'No file' });
    }
    // ensure logs dir exists
    try { fs.mkdirSync(path.join(__dirname,'logs'), { recursive: true }); } catch(e){}
    const reqInfo = { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype };
    console.log('Upload request:', reqInfo);
    try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] REQUEST ${JSON.stringify(reqInfo)}\n`); } catch(e){}

    const filename = `${Date.now()}-${req.file.originalname.replace(/[^a-z0-9.\-\_\.]/gi, '_')}`;
    const uploadResult = await supabase.storage.from(STORAGE_BUCKET).upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] SUPABASE_RESULT ${JSON.stringify({ ok: !uploadResult.error, error: uploadResult.error ? String(uploadResult.error) : null })}\n`); } catch(e){}
    console.log('Supabase upload result:', uploadResult && (uploadResult.error ? { error: uploadResult.error } : { data: uploadResult.data }));
    if (uploadResult && uploadResult.error) {
      const err = uploadResult.error;
      console.error('Storage upload error', err);
      try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] SUPABASE_ERROR ${String(err)}\n`); } catch(e){}
      return res.status(500).json({ error: err.message || 'Upload failed', details: err });
    }
    const base = SUPABASE_URL.replace(/\/$/, '');
    const publicURL = `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${encodeURIComponent(filename)}`;
    try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] PUBLIC_URL ${publicURL}\n`); } catch(e){}
    return res.json({ url: publicURL });
  } catch (e) {
    console.error('Upload exception', e);
    try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] EXCEPTION ${String(e)}\n${e.stack||''}\n`); } catch(err){}
    return res.status(500).json({ error: e.message || 'Upload failed', stack: e.stack });
  }
});

// Configuration
app.get('/api/config', async (req, res) => {
  const now = Date.now();

  if (cachedConfig && now - cachedAt < CACHE_TTL) {
    console.log('Serving config from cache');
    return res.json(cachedConfig);
  }

  try {
    const { data, error } = await supabase
      .from('configuration')
      .select(
        'restaurant_name, hero_images, about_images, logo, contact_address, contact_phone, contact_email, contact_hours'
      )
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const cfg = data || {};

    // Parse JSON strings back to objects
    function parseLenientJson(value) {
      let v = value;
      for (let i = 0; i < 4; i++) {
        if (typeof v === 'string') {
          try { v = JSON.parse(v); } catch (e) { break; }
        } else break;
      }
      return v;
    }

    // Parse hero_images
    try {
      const parsedHero = parseLenientJson(cfg.hero_images || []);
      cfg.hero_images = Array.isArray(parsedHero) ? parsedHero : [];
      // normalize hero entries to plain strings (URLs)
      cfg.hero_images = cfg.hero_images.map(h => (typeof h === 'string' ? h : (h && h.path ? h.path : null))).filter(Boolean);
    } catch (e) { cfg.hero_images = []; }

    // Parse about_images
    try {
      const parsedAbout = parseLenientJson(cfg.about_images || []);
      cfg.about_images = Array.isArray(parsedAbout) ? parsedAbout : [];
      cfg.about_images = cfg.about_images.map(h => (typeof h === 'string' ? h : (h && h.path ? h.path : null))).filter(Boolean);
    } catch (e) { cfg.about_images = []; }

    // Normalize logo
    try {
      let logoVal = cfg.logo || '';
      if (typeof logoVal !== 'string') logoVal = '';
      logoVal = logoVal.trim();
      const isAbsolute = /^https?:\/\//i.test(logoVal);
      if (!isAbsolute) {
        const parts = logoVal.split('/').filter(Boolean);
        const filename = parts.length ? parts[parts.length-1] : '';
        if (filename) {
          const base = SUPABASE_URL.replace(/\/$/, '');
          cfg.logo = `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${encodeURIComponent(filename)}`;
        } else {
          const base = SUPABASE_URL.replace(/\/$/, '');
          cfg.logo = `${base}/storage/v1/object/public/${STORAGE_BUCKET}/logo.png`;
        }
      }
    } catch (e) {
      console.warn('Logo normalization failed', e);
    }

    cachedConfig = cfg;
    cachedAt = now;
    console.log('Config cached:', cachedConfig);

    return res.json(cachedConfig);
  } catch (e) {
    console.error('GET /api/config error', e);
    return res.status(500).json({ error: e.message });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    console.log('PUT /api/config received:', JSON.stringify(req.body, null, 2));
    const body = req.body || {};
    const { data: existingArr, error: selErr } = await supabase.from('configuration').select('*').order('id', { ascending: true }).limit(1);
    if (selErr) throw selErr;
    const existing = (existingArr && existingArr[0]) ? existingArr[0] : null;
    // Cleanup: remove hero images removed from the incoming payload and remove replaced logo from Storage
    try {
      function parseLenientJson(value) {
        let v = value;
        for (let i = 0; i < 4; i++) {
          if (typeof v === 'string') {
            try { v = JSON.parse(v); } catch (e) { break; }
          } else break;
        }
        return v;
      }

      const oldHeroParsed = existing ? parseLenientJson(existing.hero_images || []) : [];
      const oldHeroArr = Array.isArray(oldHeroParsed) ? oldHeroParsed.map(h => (typeof h === 'string' ? h : (h && h.path ? h.path : null))).filter(Boolean) : [];
      const newHeroArr = Array.isArray(body.hero_images) ? body.hero_images.map(h => (typeof h === 'string' ? h : (h && h.path ? h.path : null))).filter(Boolean) : [];
      const removedHeroes = oldHeroArr.filter(x => !newHeroArr.includes(x));
      const baseStoragePrefix = SUPABASE_URL.replace(/\/$/, '') + `/storage/v1/object/public/${STORAGE_BUCKET}/`;
      for (const url of removedHeroes) {
        try {
          if (typeof url === 'string' && url.indexOf(baseStoragePrefix) !== -1) {
            const parts = url.split('/');
            const filename = decodeURIComponent(parts[parts.length - 1] || '');
            if (filename) {
              const { error: remErr } = await supabase.storage.from(STORAGE_BUCKET).remove([filename]);
              if (remErr) console.warn('Failed to remove hero image from storage', remErr);
              try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] REMOVED_HERO ${filename}\n`); } catch(e){}
            }
          }
        } catch (e) { console.warn('Failed to remove old hero image', url, e && e.message); }
      }

      // logo cleanup: if logo changed and old logo points to our bucket, remove it
      try {
        const oldLogo = existing && existing.logo ? (typeof existing.logo === 'string' ? existing.logo : '') : '';
        const newLogo = typeof body.logo === 'string' ? body.logo : (existing ? existing.logo : '');
        if (oldLogo && newLogo && oldLogo !== newLogo && oldLogo.indexOf(baseStoragePrefix) !== -1) {
          const parts = oldLogo.split('/');
          const filename = decodeURIComponent(parts[parts.length - 1] || '');
          if (filename) {
            const { error: remErr } = await supabase.storage.from(STORAGE_BUCKET).remove([filename]);
            if (remErr) console.warn('Failed to remove old logo from storage', remErr);
            try { fs.appendFileSync(path.join(__dirname,'logs','upload.log'), `[${new Date().toISOString()}] REMOVED_OLD_LOGO ${filename}\n`); } catch(e){}
          }
        }
      } catch(e) { console.warn('Failed to remove old logo', e && e.message); }
    } catch(e) {
      console.warn('Cleanup step failed', e && e.message);
    }

    const payload = {
      theme: typeof body.theme === 'string' ? body.theme : (existing ? existing.theme : 'default'),
      hero_images: JSON.stringify(Array.isArray(body.hero_images) ? body.hero_images : (existing ? (existing.hero_images || []) : [])),
      logo: typeof body.logo === 'string' ? body.logo : (existing ? existing.logo : '/assets/images/logo.png'),
      restaurant_name: typeof body.restaurant_name === 'string' ? body.restaurant_name : (existing ? existing.restaurant_name : "O'naan Pizza"),
      about_images: JSON.stringify(Array.isArray(body.about_images) ? body.about_images : (existing ? (existing.about_images || []) : [])),
      primary_color: typeof body.primary_color === 'string' ? body.primary_color : (existing ? existing.primary_color : '#C41E3A'),
      secondary_color: typeof body.secondary_color === 'string' ? body.secondary_color : (existing ? existing.secondary_color : '#FF6B35'),
      accent_color: typeof body.accent_color === 'string' ? body.accent_color : (existing ? existing.accent_color : '#FFD700'),
      contact_address: typeof body.contact_address === 'string' ? body.contact_address : (existing ? existing.contact_address : ''),
      contact_phone: typeof body.contact_phone === 'string' ? body.contact_phone : (existing ? existing.contact_phone : ''),
      contact_email: typeof body.contact_email === 'string' ? body.contact_email : (existing ? existing.contact_email : ''),
      contact_hours: typeof body.contact_hours === 'string' ? body.contact_hours : (existing ? existing.contact_hours : '')
    };
    if (!existing) {
      const { data, error } = await supabase.from('configuration').insert(payload).select().limit(1).single();
      if (error) throw error;
      // Invalidate cache
      cachedConfig = null;
      cachedAt = 0;
      return res.json({ id: data.id });
    } else {
      const { data, error } = await supabase.from('configuration').update(payload).eq('id', existing.id).select().limit(1).single();
      if (error) throw error;
      // Invalidate cache
      cachedConfig = null;
      cachedAt = 0;
      return res.json({ changes: 1 });
    }
  } catch (e) {
    console.error('PUT /api/config error', e);
    return res.status(500).json({ error: e.message });
  }
});

// Categories CRUD
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('id, slug, name, icon, display_order').order('display_order', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { slug, name, icon } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'slug & name required' });
    const { data, error } = await supabase.from('categories').insert({ slug, name, icon: icon || '' }).select().limit(1).single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.put('/api/categories/:slug', async (req, res) => {
  try {
    const oldSlug = req.params.slug;
    const { name, slug, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { data: found, error: fErr } = await supabase.from('categories').select('id, icon').eq('slug', oldSlug).limit(1).maybeSingle();
    if (fErr) throw fErr;
    if (!found) return res.status(404).json({ error: 'Category not found' });
    // if icon changed and old icon is in storage, remove it
    try {
      const oldIcon = found.icon || '';
      const newIcon = typeof icon === 'string' ? icon : '';
      if (oldIcon && newIcon && oldIcon !== newIcon) {
        await removeStorageFile(oldIcon);
      }
    } catch(e) { console.warn('Category icon cleanup failed', e && e.message); }
    const { data, error } = await supabase.from('categories').update({ slug: slug || oldSlug, name, icon: icon || '' }).eq('id', found.id).select().limit(1).single();
    if (error) throw error;
    res.json({ updated: 1 });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.delete('/api/categories/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const { data: found, error: fErr } = await supabase.from('categories').select('id, icon').eq('slug', slug).limit(1).maybeSingle();
    if (fErr) throw fErr;
    if (!found) return res.status(404).json({ error: 'Category not found' });
    const catId = found.id;
    // check products
    const { data: prods, error: pe } = await supabase.from('products').select('id').eq('category_id', catId);
    if (pe) throw pe;
    const count = (prods || []).length;
    if (count > 0) return res.status(400).json({ error: `Cannot delete category that contains ${count} product(s). Reassign or remove products first.` });
    // remove category icon from storage if present
    try { if (found.icon) await removeStorageFile(found.icon); } catch(e) { console.warn('Failed to remove category icon', e && e.message); }
    const { error } = await supabase.from('categories').delete().eq('id', catId);
    if (error) throw error;
    res.json({ deleted: 1 });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    const { data: products, error: pErr } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (pErr) throw pErr;
    let out = products || [];
    if (category) {
      const { data: cat } = await supabase.from('categories').select('id').eq('slug', category).limit(1).maybeSingle();
      const catId = cat ? cat.id : null;
      out = out.filter(p => p.category_id === catId);
    }
    const { data: allCats } = await supabase.from('categories').select('id,slug,name');
    const catMap = {};
    (allCats || []).forEach(c => { catMap[c.id] = c; });
    const mapped = out.map(p => ({
      id: p.id, slug: p.slug, title: p.title, description: p.description, price: p.price, img: p.img,
      bread_types: p.bread_types, is_spicy: p.is_spicy, is_new: p.is_new, is_popular: p.is_popular, is_customizable: p.is_customizable, available_supplements: p.available_supplements,
      category_slug: (catMap[p.category_id] && catMap[p.category_id].slug) || null,
      category_name: (catMap[p.category_id] && catMap[p.category_id].name) || null
    }));
    res.json(mapped);
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.post('/api/products', async (req,res) => {
  try {
    const { slug, title, description, price, img, category_slug, is_spicy, is_new, is_popular } = req.body;
    if (!title || !price || !description || !img) return res.status(400).json({error: 'title, price, description and img required'});
    let category_id = null;
    if (category_slug) {
      const { data: cat, error: cErr } = await supabase.from('categories').select('id').eq('slug', category_slug).limit(1).maybeSingle();
      if (cErr) throw cErr;
      category_id = cat ? cat.id : null;
    }
    const payload = { slug: slug || title.toLowerCase().replace(/\s+/g,'-'), title, description, price, img, category_id, is_spicy: !!is_spicy, is_new: !!is_new, is_popular: !!is_popular, badge: '' };
    const { data, error } = await supabase.from('products').insert(payload).select().limit(1).single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.put('/api/products/:id', async (req,res) => {
  try {
    const id = req.params.id;
    const { title, description, price, img, category_slug, is_spicy, is_new, is_popular } = req.body;
    if (!title || !price || !description || !img) return res.status(400).json({error: 'title, price, description and img required'});
    // fetch existing product to detect image changes
    const { data: existing, error: exErr } = await supabase.from('products').select('*').eq('id', id).limit(1).maybeSingle();
    if (exErr) throw exErr;
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    let category_id = null;
    if (category_slug) {
      const { data: cat, error: cErr } = await supabase.from('categories').select('id').eq('slug', category_slug).limit(1).maybeSingle();
      if (cErr) throw cErr;
      category_id = cat ? cat.id : null;
    }
    // if image changed, remove previous file from storage
    try {
      const oldImg = existing.img || '';
      const newImg = img || '';
      if (oldImg && newImg && oldImg !== newImg) {
        await removeStorageFile(oldImg);
      }
    } catch(e) { console.warn('Failed to cleanup old product image', e && e.message); }
    const payload = { title, description, price, img, category_id, is_spicy: !!is_spicy, is_new: !!is_new, is_popular: !!is_popular, badge: '' };
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().limit(1).single();
    if (error) throw error;
    res.json({ changes: 1 });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.delete('/api/products/:id', async (req,res) => {
  try {
    const id = req.params.id;
    const { data: existing, error: exErr } = await supabase.from('products').select('*').eq('id', id).limit(1).maybeSingle();
    if (exErr) throw exErr;
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    try { if (existing.img) await removeStorageFile(existing.img); } catch(e) { console.warn('Failed to remove product image', e && e.message); }
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    res.json({ deleted: 1 });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

// Daily specials
app.get('/api/daily-specials', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0,10);
    const { data: rows, error } = await supabase.from('daily_specials').select('*').eq('date', date).order('ord', { ascending: true });
    if (error) throw error;
    const productIds = [...new Set((rows||[]).filter(r => r.product_id).map(r => r.product_id))];
    const specialIds = [...new Set((rows||[]).filter(r => r.special_id).map(r => r.special_id))];
    const productsMap = {};
    const specialsMap = {};
    if (productIds.length) {
      const { data: prods } = await supabase.from('products').select('id,slug,title,description,price,img,category_id').in('id', productIds);
      (prods||[]).forEach(p=>productsMap[p.id]=p);
    }
    if (specialIds.length) {
      const { data: sp } = await supabase.from('specials').select('id,title,description,price,img').in('id', specialIds);
      (sp||[]).forEach(s=>specialsMap[s.id]=s);
    }
    const catIds = [...new Set(Object.values(productsMap).map(p=>p.category_id).filter(Boolean))];
    const catMap = {};
    if (catIds.length) {
      const { data: cats } = await supabase.from('categories').select('id,slug').in('id', catIds);
      (cats||[]).forEach(c=>catMap[c.id]=c);
    }
    const out = (rows||[]).map(r => {
      const sp = r.special_id ? specialsMap[r.special_id] : null;
      const pr = r.product_id ? productsMap[r.product_id] : null;
      const title = (sp && sp.title) || (pr && pr.title) || '';
      const description = (sp && sp.description) || (pr && pr.description) || '';
      const price = r.price_override || (sp && sp.price) || (pr && pr.price) || '';
      const img = (sp && sp.img) || (pr && pr.img) || '';
      const category_slug = pr && pr.category_id ? (catMap[pr.category_id] && catMap[pr.category_id].slug) : null;
      return { id: r.id, product_id: r.product_id, special_id: r.special_id, note: r.note, price, ord: r.ord, date: r.date, title, description, img, category_slug };
    });
    res.json(out);
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.post('/api/daily-specials', async (req, res) => {
  try {
    const { product_id, special_id, note, price_override, date } = req.body;
    const d = date || new Date().toISOString().slice(0,10);
    const { data: maxRow } = await supabase.from('daily_specials').select('ord').eq('date', d).order('ord', { ascending: false }).limit(1).maybeSingle();
    const ord = (maxRow && maxRow.ord >= 0) ? maxRow.ord + 1 : 0;
    const { data, error } = await supabase.from('daily_specials').insert({ product_id: product_id||null, special_id: special_id||null, note: note||'', price_override: price_override||'', ord, date: d }).select().limit(1).single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.put('/api/daily-specials/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { note, price_override, ord, product_id, date } = req.body;
    const payload = { note: note||'', price_override: price_override||'', ord: ord||0, product_id: product_id||null, date: date||new Date().toISOString().slice(0,10) };
    const { data, error } = await supabase.from('daily_specials').update(payload).eq('id', id).select().limit(1).single();
    if (error) throw error;
    res.json({ changes: 1 });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.delete('/api/daily-specials/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('daily_specials').delete().eq('id', id);
    if (error) throw error;
    res.json({ deleted: 1 });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

// Specials CRUD
app.get('/api/specials', async (req,res) => {
  try { const { data, error } = await supabase.from('specials').select('id, title, description, price, img, created_at').order('id', { ascending: false }); if (error) throw error; res.json(data || []); } catch(e){ res.status(500).json({ error: e.message || 'Supabase error' }); }
});
app.post('/api/specials', async (req,res) => { try { const { title, description, price, img } = req.body; if (!title) return res.status(400).json({ error: 'title required' }); const { data, error } = await supabase.from('specials').insert({ title, description: description||'', price: price||'', img: img||'' }).select().limit(1).single(); if (error) throw error; res.json({ id: data.id }); } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); } });
app.put('/api/specials/:id', async (req,res) => { try { const id = req.params.id; const { title, description, price, img } = req.body; const { data, error } = await supabase.from('specials').update({ title, description: description||'', price: price||'', img: img||'' }).eq('id', id).select().limit(1).single(); if (error) throw error; res.json({ changes: 1 }); } catch(e){ res.status(500).json({ error: e.message || 'Supabase error' }); } });
app.delete('/api/specials/:id', async (req,res) => { try { const id = req.params.id; const { error } = await supabase.from('specials').delete().eq('id', id); if (error) throw error; res.json({ deleted: 1 }); } catch(e){ res.status(500).json({ error: e.message || 'Supabase error' }); } });

// Promotions CRUD
app.get('/api/promotions', async (req,res) => { try { const { data, error } = await supabase.from('promotions').select('*').order('id', { ascending: false }); if (error) throw error; res.json(data || []); } catch(e){ res.status(500).json({ error: e.message || 'Supabase error' }); } });
app.get('/api/promotions/:id', async (req,res) => { try { const id = req.params.id; const { data, error } = await supabase.from('promotions').select('*').eq('id', id).limit(1).maybeSingle(); if (error) throw error; if (!data) return res.status(404).json({ error: 'Promotion not found' }); res.json(data); } catch(e){ res.status(500).json({ error: e.message || 'Supabase error' }); } });
app.post('/api/promotions', async (req,res) => { try { const { title, subtitle, badge_text, image_url } = req.body; if (!title || !subtitle) return res.status(400).json({ error: 'Title and subtitle required' }); const { data, error } = await supabase.from('promotions').insert({ title, subtitle, badge_text: badge_text||'', image_url: image_url||'' }).select().limit(1).single(); if (error) throw error; res.json({ id: data.id }); } catch(e){ res.status(500).json({ error: e.message || 'Supabase error' }); } });
app.put('/api/promotions/:id', async (req,res) => {
  try {
    const id = req.params.id;
    const { title, subtitle, badge_text, image_url } = req.body;
    // fetch existing promotion to detect image change
    const { data: existing, error: exErr } = await supabase.from('promotions').select('*').eq('id', id).limit(1).maybeSingle();
    if (exErr) throw exErr;
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });
    // if image changed, remove previous file from storage
    try {
      const oldImg = existing.image_url || '';
      const newImg = typeof image_url === 'string' ? image_url : '';
      if (oldImg && newImg && oldImg !== newImg) {
        await removeStorageFile(oldImg);
      }
    } catch(e) { console.warn('Failed to cleanup old promotion image', e && e.message); }
    const { data, error } = await supabase.from('promotions').update({ title, subtitle, badge_text: badge_text||'', image_url: image_url||'' }).eq('id', id).select().limit(1).single();
    if (error) throw error;
    res.json({ changes: 1 });
  } catch(e){ res.status(500).json({ error: e.message || 'Supabase error' }); }
});

app.delete('/api/promotions/:id', async (req,res) => {
  try {
    const id = req.params.id;
    const { data: existing, error: exErr } = await supabase.from('promotions').select('*').eq('id', id).limit(1).maybeSingle();
    if (exErr) throw exErr;
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });
    try { if (existing.image_url) await removeStorageFile(existing.image_url); } catch(e) { console.warn('Failed to remove promotion image', e && e.message); }
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) throw error;
    res.json({ deleted: 1 });
  } catch(e){ res.status(500).json({ error: e.message || 'Supabase error' }); }
});

// Newsletter signup: save client email to `clients` table
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'invalid email' });
    }

    // check existing
    const { data: existing, error: exErr } = await supabase.from('clients').select('id,email').eq('email', email).limit(1).maybeSingle();
    if (exErr) throw exErr;
    if (existing && existing.id) {
      return res.json({ id: existing.id, message: 'already_subscribed' });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase.from('clients').insert({ email, date: now }).select().limit(1).single();
    if (error) throw error;
    return res.json({ id: data.id, message: 'subscribed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Supabase error' });
  }
});

// Admin: list newsletter subscribers
app.get('/api/newsletter', async (req, res) => {
  try {
    // TODO: add admin auth check if available
    const { data, error } = await supabase.from('clients').select('id,email,date').order('date', { ascending: false }).limit(1000);
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (e) {
    console.error('GET /api/newsletter error', e);
    return res.status(500).json({ error: e.message || 'Supabase error' });
  }
});

// Admin: delete subscriber by id
app.delete('/api/newsletter/:id', async (req, res) => {
  try {
    // TODO: add admin auth check
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    return res.json({ deleted: 1 });
  } catch (e) {
    console.error('DELETE /api/newsletter/:id error', e);
    return res.status(500).json({ error: e.message || 'Supabase error' });
  }
});

// Reviews fetch/store
async function fetchAndStoreGoogleReviews(place_id, api_key, language = 'fr') {
  if (!place_id || !api_key) throw new Error('place_id and api_key required');
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=rating,user_ratings_total,reviews&language=${encodeURIComponent(language)}&key=${encodeURIComponent(api_key)}`;
  console.log('Fetching Google Places (lang=' + language + '):', url.replace(/key=[^&]+/, 'key=REDACTED'));
  // Ensure a fetch implementation exists (Node may not provide global.fetch)
  const fetchFn = (typeof fetch === 'function') ? fetch : (await import('node-fetch')).default;
  const resp = await fetchFn(url);
  const jr = await resp.json();
  if (!jr || jr.status !== 'OK') throw new Error('Google Places error: ' + (jr && jr.status));
  const result = jr.result || {};
  console.log('reviews: fetched from Google, reviews count=', (result.reviews || []).length);
  const avg = result.rating || null;
  const total = result.user_ratings_total || 0;
  const rawReviews = result.reviews || [];
  const reviews = rawReviews.slice(0, 50).map(r => ({ author: r.author_name, rating: r.rating, time: r.time, relative_time_description: r.relative_time_description || '', text: r.text }));
  const now = new Date().toISOString();
  const payload = { provider: 'google', place_id, fetched_at: now, avg_rating: avg, total_reviews: total, reviews_json: JSON.stringify(reviews) };
  // If a snapshot for this provider+place_id already exists, update it; otherwise insert.
  const { data: existing, error: exErr } = await supabase.from('reviews_snapshots').select('id, fetched_at, avg_rating, total_reviews').eq('provider', 'google').eq('place_id', place_id).order('fetched_at', { ascending: false }).limit(1).maybeSingle();
  if (exErr) throw exErr;
  console.log('reviews: existing snapshot lookup ->', existing ? { id: existing.id, fetched_at: existing.fetched_at, avg_rating: existing.avg_rating, total_reviews: existing.total_reviews } : null);
  let outRow;
  if (existing && existing.id) {
    console.log('reviews: updating existing id', existing.id);
    const { data, error } = await supabase.from('reviews_snapshots').update(payload).eq('id', existing.id).select().limit(1).single();
    if (error) {
      console.warn('reviews: update error', error.message || error);
      throw error;
    }
    console.log('reviews: update result id', data && data.id);
    outRow = data;
  } else {
    console.log('reviews: inserting new snapshot');
    const { data, error } = await supabase.from('reviews_snapshots').insert(payload).select().limit(1).single();
    if (error) {
      console.warn('reviews: insert error', error.message || error);
      throw error;
    }
    console.log('reviews: insert result id', data && data.id);
    outRow = data;
  }
  return { id: outRow.id, fetched_at: now, avg_rating: avg, total_reviews: total, reviews };
}

app.post('/api/reviews/fetch', async (req,res) => {
  try {
    const { provider, place_id, api_key, language } = req.body || {};
    if (provider !== 'google') return res.status(400).json({ error: 'only google provider supported' });
    const key = api_key || process.env.REV_API_KEY;
    if (!place_id || !key) return res.status(400).json({ error: 'place_id and api_key required' });
    const lang = language || process.env.REV_LANG || 'fr';
    const out = await fetchAndStoreGoogleReviews(place_id, key, lang);
    res.json(out);
  } catch(e) { res.status(500).json({ error: e.message || 'error' }); }
});

app.get('/api/reviews', async (req,res) => {
  try {
    const provider = req.query.provider || 'google';
    const place_id = req.query.place_id;
    const refresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const lang = req.query.language || process.env.REV_LANG || 'fr';
    if (!place_id) return res.status(400).json({ error: 'place_id required' });
    if (refresh) {
      try {
        const key = process.env.REV_API_KEY;
        if (!key) return res.status(400).json({ error: 'server missing REV_API_KEY for refresh' });
        const fetched = await fetchAndStoreGoogleReviews(place_id, key, lang);
        // fetched already returns id + reviews
        return res.json(fetched);
      } catch(err) {
        console.warn('reviews: forced refresh failed', err && err.message);
        return res.status(500).json({ error: err.message || 'refresh failed' });
      }
    }
    const { data, error } = await supabase.from('reviews_snapshots').select('*').eq('provider', provider).eq('place_id', place_id).order('fetched_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return res.json({});
    let reviews = [];
    try { reviews = data.reviews_json ? JSON.parse(data.reviews_json) : []; } catch(e){ reviews = []; }

    // Support sorting/filtering from client: ?sort=best&limit=10
    const sortMode = (req.query.sort || '').toLowerCase();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    if (sortMode === 'best') {
      // Sort by rating desc, then by time desc (most recent among highest rated)
      reviews = reviews.slice().sort((a,b) => {
        const ra = Number(a.rating || 0), rb = Number(b.rating || 0);
        if (rb !== ra) return rb - ra;
        const ta = Number(a.time || 0), tb = Number(b.time || 0);
        return tb - ta;
      }).slice(0, limit);
    } else {
      // default: return latest reviews as stored (first N)
      reviews = reviews.slice(0, limit);
    }

    return res.json({ id: data.id, provider: data.provider, place_id: data.place_id, fetched_at: data.fetched_at, avg_rating: data.avg_rating, total_reviews: data.total_reviews, reviews });
  } catch(e) { res.status(500).json({ error: e.message || 'Supabase error' }); }
});

// Optional scheduled fetch
if (process.env.REV_PROVIDER === 'google' && process.env.REV_PLACE_ID && process.env.REV_API_KEY) {
  const place = process.env.REV_PLACE_ID;
  const key = process.env.REV_API_KEY;
  (async () => { try { await fetchAndStoreGoogleReviews(place, key); console.log('Initial reviews fetch complete'); } catch(e) { console.warn('Initial reviews fetch failed', e.message); } })();
  setInterval(async () => { try { await fetchAndStoreGoogleReviews(place, key); console.log('Scheduled reviews fetch complete'); } catch(e) { console.warn('Scheduled reviews fetch failed', e.message); } }, 24 * 60 * 60 * 1000);
}

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));


