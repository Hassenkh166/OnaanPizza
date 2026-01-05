const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json({limit: '5mb'}));

const DB_FILE = path.join(__dirname, 'data.db');
const PORT = process.env.PORT || 3000;

const dbExists = fs.existsSync(DB_FILE);
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  if (!dbExists) {
    db.run(`CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, name TEXT, icon TEXT, display_order INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE,
      title TEXT,
      description TEXT,
      price TEXT,
      img TEXT,
      category_id INTEGER,
      badge TEXT,
      bread_types TEXT,
      is_spicy INTEGER DEFAULT 0,
      is_new INTEGER DEFAULT 0,
      is_popular INTEGER DEFAULT 0,
      is_customizable INTEGER DEFAULT 0,
      available_supplements TEXT,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )`);
    // new single-row configuration table to store site-wide settings (can be extended later)
    db.run(`CREATE TABLE configuration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme TEXT,
      hero_images TEXT,
      logo TEXT,
      restaurant_name TEXT,
      about_images TEXT,
      primary_color TEXT,
      secondary_color TEXT,
      accent_color TEXT,
      contact_address TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      contact_hours TEXT
    )`);

    // seed categories with icons
    const cats = [
      {slug: 'pizzas', name: 'Pizzas', icon: '🍕', order: 1},
      {slug: 'sandwichs', name: 'Sandwichs', icon: '🥖', order: 2},
      {slug: 'assiettes', name: 'Assiettes', icon: '🍽️', order: 3},
      {slug: 'desserts', name: 'Desserts', icon: '🍰', order: 4},
      {slug: 'boissons', name: 'Boissons', icon: '🥤', order: 5},
      {slug: 'supplements', name: 'Suppléments', icon: '➕', order: 6}
    ];
    const stmt = db.prepare('INSERT INTO categories (slug, name, icon, display_order) VALUES (?,?,?,?)');
    for (let cat of cats) stmt.run(cat.slug, cat.name, cat.icon, cat.order);
    stmt.finalize();

  
  }
});

// Migrations pour ajouter les nouvelles colonnes
db.serialize(() => {
  db.all("PRAGMA table_info(products)", (err, cols) => {
    if (err) return;
    const names = (cols || []).map(c => c.name);
    
    const migrations = [
      {col: 'badge', sql: 'ALTER TABLE products ADD COLUMN badge TEXT'},
      {col: 'bread_types', sql: 'ALTER TABLE products ADD COLUMN bread_types TEXT'},
      {col: 'is_spicy', sql: 'ALTER TABLE products ADD COLUMN is_spicy INTEGER DEFAULT 0'},
      {col: 'is_new', sql: 'ALTER TABLE products ADD COLUMN is_new INTEGER DEFAULT 0'},
      {col: 'is_popular', sql: 'ALTER TABLE products ADD COLUMN is_popular INTEGER DEFAULT 0'},
      {col: 'is_customizable', sql: 'ALTER TABLE products ADD COLUMN is_customizable INTEGER DEFAULT 0'},
      {col: 'available_supplements', sql: 'ALTER TABLE products ADD COLUMN available_supplements TEXT'}
    ];
    
    migrations.forEach(m => {
      if (!names.includes(m.col)) {
        try {
          db.run(m.sql);
          console.log(`Migration: added ${m.col} to products`);
        } catch(e) { console.warn(`Migration failed (${m.col})`); }
      }
    });
  });
  
  db.all("PRAGMA table_info(categories)", (err, cols) => {
    if (err) return;
    const names = (cols || []).map(c => c.name);
    
    if (!names.includes('icon')) {
      try {
        db.run('ALTER TABLE categories ADD COLUMN icon TEXT');
        console.log('Migration: added icon to categories');
      } catch(e) { console.warn('Migration failed (icon)'); }
    }
    
    if (!names.includes('display_order')) {
      try {
        db.run('ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0');
        console.log('Migration: added display_order to categories');
      } catch(e) { console.warn('Migration failed (display_order)'); }
    }
  });
});

// ensure daily_specials table exists
db.run(`CREATE TABLE IF NOT EXISTS daily_specials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  special_id INTEGER,
  note TEXT,
  price_override TEXT,
  ord INTEGER,
  date TEXT,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(special_id) REFERENCES specials(id)
)`);

// ensure specials table exists (templates for daily specials)
db.run(`CREATE TABLE IF NOT EXISTS specials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  price TEXT,
  img TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

// create promotions table (replaces daily_specials functionality)
db.run(`CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge_text TEXT,
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

// Migration: add badge_text column if missing
db.serialize(() => {
  db.all("PRAGMA table_info(promotions)", (err, cols) => {
    if (err) return;
    const names = (cols || []).map(c => c.name);
    if (!names.includes('badge_text')) {
      try {
        db.run('ALTER TABLE promotions ADD COLUMN badge_text TEXT');
        console.log('Migration: added badge_text column to promotions');
      } catch(e) { console.warn('Migration failed (badge_text)'); }
    }
  });
});

// lightweight migration: if existing daily_specials table was created earlier without special_id, add the column
db.serialize(() => {
  db.all("PRAGMA table_info(daily_specials)", (err, cols) => {
    if (err) return; // ignore
    const names = (cols || []).map(c => c.name);
    if (!names.includes('special_id')) {
      try {
        db.run('ALTER TABLE daily_specials ADD COLUMN special_id INTEGER');
        console.log('Migration: added special_id column to daily_specials');
      } catch(e) { console.warn('Migration failed (special_id)'); }
    }
  });
});

// Migration: add new columns to existing configuration table (only if upgrading from old version)
db.serialize(() => {
  db.all("PRAGMA table_info(configuration)", (err, cols) => {
    if (err) return; // ignore
    const names = (cols || []).map(c => c.name);
    
    if (!names.includes('primary_color')) {
      try {
        db.run('ALTER TABLE configuration ADD COLUMN primary_color TEXT DEFAULT "#8B4513"');
        console.log('Migration: added primary_color column to configuration');
      } catch(e) { console.warn('Migration failed (primary_color)'); }
    }
    
    if (!names.includes('secondary_color')) {
      try {
        db.run('ALTER TABLE configuration ADD COLUMN secondary_color TEXT DEFAULT "#D2691E"');
        console.log('Migration: added secondary_color column to configuration');
      } catch(e) { console.warn('Migration failed (secondary_color)'); }
    }
    
    if (!names.includes('accent_color')) {
      try {
        db.run('ALTER TABLE configuration ADD COLUMN accent_color TEXT DEFAULT "#FF6B35"');
        console.log('Migration: added accent_color column to configuration');
      } catch(e) { console.warn('Migration failed (accent_color)'); }
    }
    
    if (!names.includes('contact_address')) {
      try {
        db.run('ALTER TABLE configuration ADD COLUMN contact_address TEXT DEFAULT "123 Rue de la Médina, Tunis"');
        console.log('Migration: added contact_address column to configuration');
      } catch(e) { console.warn('Migration failed (contact_address)'); }
    }
    
    if (!names.includes('contact_phone')) {
      try {
        db.run('ALTER TABLE configuration ADD COLUMN contact_phone TEXT DEFAULT "+216 XX XXX XXX"');
        console.log('Migration: added contact_phone column to configuration');
      } catch(e) { console.warn('Migration failed (contact_phone)'); }
    }
    
    if (!names.includes('contact_email')) {
      try {
        db.run('ALTER TABLE configuration ADD COLUMN contact_email TEXT DEFAULT "contact@saveursdetunis.tn"');
        console.log('Migration: added contact_email column to configuration');
      } catch(e) { console.warn('Migration failed (contact_email)'); }
    }
    
    if (!names.includes('contact_hours')) {
      try {
        db.run('ALTER TABLE configuration ADD COLUMN contact_hours TEXT DEFAULT "Lundi-Dimanche: 11h-23h"');
        console.log('Migration: added contact_hours column to configuration');
      } catch(e) { console.warn('Migration failed (contact_hours)'); }
    }
  });
});

// lightweight migration: if configuration is empty but hero_images table exists, migrate hero images into configuration
db.serialize(() => {
  db.get("SELECT COUNT(*) as c FROM configuration", (err, row) => {
    if (err) return; // ignore
    const count = (row && row.c) ? row.c : 0;
    if (count === 0) {
      // check if hero_images table exists
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='hero_images'", (err2, trow) => {
        if (trow && trow.name === 'hero_images') {
          // read existing hero images
          db.all('SELECT path, ord FROM hero_images ORDER BY ord ASC', (err3, rows) => {
            const hero = (rows || []).map(r => ({ path: r.path }));
            const defaults = {
              theme: 'default',
              hero_images: JSON.stringify(hero),
              logo: '/assets/images/logo.png',
              restaurant_name: 'O\'naan Pizza',
              about_images: JSON.stringify([]),
              primary_color: '#C41E3A',
              secondary_color: '#FF6B35',
              accent_color: '#FFD700',
              contact_address: '9 Rue Charles Schmidt, 93400 Saint-Ouen-sur-Seine',
              contact_phone: '01 89 46 58 49',
              contact_email: 'contact@onaanpizza.fr',
              contact_hours: '7/7j 10h-00h'
            };
            const s = db.prepare('INSERT INTO configuration (theme, hero_images, logo, restaurant_name, about_images, primary_color, secondary_color, accent_color, contact_address, contact_phone, contact_email, contact_hours) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
            s.run(defaults.theme, defaults.hero_images, defaults.logo, defaults.restaurant_name, defaults.about_images, defaults.primary_color, defaults.secondary_color, defaults.accent_color, defaults.contact_address, defaults.contact_phone, defaults.contact_email, defaults.contact_hours, function(err4){
              s.finalize();
              // after migration, drop the old table
              db.run('DROP TABLE IF EXISTS hero_images', (err5) => {
                if (err5) console.warn('Could not drop hero_images table', err5);
                else console.log('Dropped legacy hero_images table after migration');
              });
            });
          });
        } else {
          // no legacy table: insert a default configuration row
          const s2 = db.prepare('INSERT INTO configuration (theme, hero_images, logo, restaurant_name, about_images, primary_color, secondary_color, accent_color, contact_address, contact_phone, contact_email, contact_hours) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
          s2.run('default', JSON.stringify([]), '/assets/images/logo.png', 'O\'naan Pizza', JSON.stringify([]), '#C41E3A', '#FF6B35', '#FFD700', '9 Rue Charles Schmidt, 93400 Saint-Ouen-sur-Seine', '01 89 46 58 49', 'contact@onaanpizza.fr', '7/7j 10h-00h', function(err5){ s2.finalize(); });
        }
      });
    }
  });
});

// config endpoints: get and update the single configuration row
app.get('/api/config', (req, res) => {
  console.log('API /api/config called');
  db.get('SELECT * FROM configuration ORDER BY id LIMIT 1', (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      console.log('No configuration row found');
      return res.json({});
    }
    console.log('Configuration row found:', row);
    let hero_images = [];
    let about_images = [];
    try { hero_images = row.hero_images ? JSON.parse(row.hero_images) : []; } catch(e){ hero_images = []; }
    try { about_images = row.about_images ? JSON.parse(row.about_images) : []; } catch(e){ about_images = []; }
    const response = { 
      id: row.id, 
      theme: row.theme, 
      hero_images, 
      logo: row.logo, 
      restaurant_name: row.restaurant_name, 
      about_images,
      primary_color: row.primary_color,
      secondary_color: row.secondary_color,
      accent_color: row.accent_color,
      contact_address: row.contact_address,
      contact_phone: row.contact_phone,
      contact_email: row.contact_email,
      contact_hours: row.contact_hours
    };
    console.log('Sending response:', response);
    res.json(response);
  });
});

// update configuration (partial updates supported)
app.put('/api/config', (req, res) => {
  console.log('PUT /api/config called with body:', req.body);
  const body = req.body || {};
  db.get('SELECT * FROM configuration ORDER BY id LIMIT 1', (err, row) => {
    if (err) {
      console.error('Database error in PUT config:', err);
      return res.status(500).json({ error: err.message });
    }
    const existing = row || {
      theme: 'default',
      hero_images: JSON.stringify([]),
      logo: '/assets/images/logo.png',
      restaurant_name: 'O\'naan Pizza',
      about_images: JSON.stringify([]),
      primary_color: '#C41E3A',
      secondary_color: '#FF6B35',
      accent_color: '#FFD700',
      contact_address: '9 Rue Charles Schmidt, 93400 Saint-Ouen-sur-Seine',
      contact_phone: '01 89 46 58 49',
      contact_email: 'contact@onaanpizza.fr',
      contact_hours: '7/7j 10h-00h'
    };

    console.log('Existing config:', existing);

    // merge values: if provided in body, use it; else keep existing
    const theme = (typeof body.theme === 'string') ? body.theme : existing.theme;
    const hero_images = Array.isArray(body.hero_images) ? body.hero_images : (() => { try { return JSON.parse(existing.hero_images || '[]'); } catch(e){ return []; } })();
    const logo = (typeof body.logo === 'string') ? body.logo : existing.logo;
    const restaurant_name = (typeof body.restaurant_name === 'string') ? body.restaurant_name : existing.restaurant_name;
    const about_images = Array.isArray(body.about_images) ? body.about_images : (() => { try { return JSON.parse(existing.about_images || '[]'); } catch(e){ return []; } })();
    const primary_color = (typeof body.primary_color === 'string') ? body.primary_color : existing.primary_color;
    const secondary_color = (typeof body.secondary_color === 'string') ? body.secondary_color : existing.secondary_color;
    const accent_color = (typeof body.accent_color === 'string') ? body.accent_color : existing.accent_color;
    const contact_address = (typeof body.contact_address === 'string') ? body.contact_address : existing.contact_address;
    const contact_phone = (typeof body.contact_phone === 'string') ? body.contact_phone : existing.contact_phone;
    const contact_email = (typeof body.contact_email === 'string') ? body.contact_email : existing.contact_email;
    const contact_hours = (typeof body.contact_hours === 'string') ? body.contact_hours : existing.contact_hours;

    console.log('New values:', { contact_address, contact_phone, contact_email, contact_hours });

    if (!row) {
      // insert new
      console.log('Inserting new configuration row');
      db.run('INSERT INTO configuration (theme, hero_images, logo, restaurant_name, about_images, primary_color, secondary_color, accent_color, contact_address, contact_phone, contact_email, contact_hours) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [theme, JSON.stringify(hero_images), logo, restaurant_name, JSON.stringify(about_images), primary_color, secondary_color, accent_color, contact_address, contact_phone, contact_email, contact_hours], function(err2){
        if (err2) {
          console.error('Insert error:', err2);
          return res.status(500).json({ error: err2.message });
        }
        console.log('Insert successful, new ID:', this.lastID);
        res.json({ id: this.lastID });
      });
    } else {
      console.log('Updating existing configuration row ID:', row.id);
      db.run('UPDATE configuration SET theme=?, hero_images=?, logo=?, restaurant_name=?, about_images=?, primary_color=?, secondary_color=?, accent_color=?, contact_address=?, contact_phone=?, contact_email=?, contact_hours=? WHERE id=?',
        [theme, JSON.stringify(hero_images), logo, restaurant_name, JSON.stringify(about_images), primary_color, secondary_color, accent_color, contact_address, contact_phone, contact_email, contact_hours, row.id], function(err3){
        if (err3) {
          console.error('Update error:', err3);
          return res.status(500).json({ error: err3.message });
        }
        console.log('Update successful, changes:', this.changes);
        res.json({ changes: this.changes });
      });
    }
  });
});

// Serve static files
// serve static files and images
app.use(express.static(path.join(__dirname)));
app.use('/assets/images', express.static(path.join(__dirname, 'assets', 'images')));

// multer setup for uploads
const uploadDir = path.join(__dirname, 'assets', 'images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-z0-9.\-\_\.]/gi, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

// upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/assets/images/${req.file.filename}`;
  res.json({ url });
});

// API: categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT id, slug, name, icon, display_order FROM categories ORDER BY display_order, id', (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// create category (optional admin)
app.post('/api/categories', (req,res) => {
  const { slug, name, icon } = req.body;
  if (!slug || !name) return res.status(400).json({error: 'slug & name required'});
  db.run('INSERT INTO categories (slug, name, icon) VALUES (?,?,?)', [slug, name, icon || ''], function(err){
    if (err) return res.status(500).json({error: err.message});
    res.json({id: this.lastID});
  });
});

// update category (name, slug, icon)
app.put('/api/categories/:slug', (req, res) => {
  const oldSlug = req.params.slug;
  const { name, slug, icon } = req.body;
  console.log(`PUT /api/categories/${oldSlug} called with body:`, req.body);
  if (!name) return res.status(400).json({ error: 'name required' });
  db.run('UPDATE categories SET slug = ?, name = ?, icon = ? WHERE slug = ?', [slug || oldSlug, name, icon || '', oldSlug], function(err){
    if (err) {
      console.error('Error updating category:', err);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) return res.status(404).json({ error: 'Category not found or no changes' });
    res.json({ updated: this.changes });
  });
});

// delete category by slug - PREVENT deletion if category contains products
app.delete('/api/categories/:slug', (req, res) => {
  const slug = req.params.slug;
  db.get('SELECT id FROM categories WHERE slug = ?', [slug], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Category not found' });
    const catId = row.id;
    // check if any products belong to this category
    db.get('SELECT COUNT(*) as c FROM products WHERE category_id = ?', [catId], (err2, r2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const count = (r2 && r2.c) ? r2.c : 0;
      if (count > 0) {
        return res.status(400).json({ error: `Cannot delete category that contains ${count} product(s). Reassign or remove products first.` });
      }
      // safe to delete
      db.run('DELETE FROM categories WHERE id = ?', [catId], function(err3){
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ deleted: this.changes });
      });
    });
  });
});



// API: products (optionally filter by category slug)
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  let sql = `SELECT 
    p.id, p.slug, p.title, p.description, p.price, p.img, 
    p.badge, p.bread_types, p.is_spicy, p.is_new, p.is_popular, p.is_customizable, p.available_supplements,
    c.slug as category_slug, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id`;
  const params = [];
  if (category) {
    sql += ' WHERE c.slug = ?';
    params.push(category);
  }
  sql += ' ORDER BY p.id DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// API: daily specials
// GET /api/daily-specials?date=YYYY-MM-DD  (default = today)
app.get('/api/daily-specials', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0,10);
  // join either product or special (specials are standalone templates for daily items)
  const sql = `SELECT ds.id, ds.product_id, ds.special_id, ds.note, ds.price_override, ds.ord, ds.date,
                     p.slug AS product_slug, p.title AS product_title, p.description AS product_description, p.price AS product_price, p.img AS product_img, c.slug AS category_slug,
                     s.title AS special_title, s.description AS special_description, s.price AS special_price, s.img AS special_img
               FROM daily_specials ds
                 LEFT JOIN products p ON ds.product_id = p.id
                 LEFT JOIN categories c ON p.category_id = c.id
                 LEFT JOIN specials s ON ds.special_id = s.id
               WHERE ds.date = ? ORDER BY ds.ord ASC`;
  db.all(sql, [date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // normalize rows: pick special if present else product fields
    const out = rows.map(r => {
      const title = r.special_title || r.product_title || '';
      const description = r.special_description || r.product_description || '';
      const price = r.price_override || r.special_price || r.product_price || '';
      const img = r.special_img || r.product_img || '/assets/images/restaurant.jpg';
      return { id: r.id, product_id: r.product_id, special_id: r.special_id, note: r.note, price, ord: r.ord, date: r.date, title, description, img, category_slug: r.category_slug };
    });
    res.json(out);
  });
});

// create daily special (body: { product_id, note, price_override, date })
app.post('/api/daily-specials', (req, res) => {
  const { product_id, special_id, note, price_override, date } = req.body;
  const d = date || new Date().toISOString().slice(0,10);
  db.get('SELECT COALESCE(MAX(ord), -1) as maxord FROM daily_specials WHERE date = ?', [d], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const ord = (row && row.maxord >= 0) ? row.maxord + 1 : 0;
    db.run('INSERT INTO daily_specials (product_id, special_id, note, price_override, ord, date) VALUES (?,?,?,?,?,?)', [product_id||null, special_id||null, note||'', price_override||'', ord, d], function(err){
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });
});

// update daily special
app.put('/api/daily-specials/:id', (req, res) => {
  const id = req.params.id;
  const { note, price_override, ord, product_id, date } = req.body;
  db.run('UPDATE daily_specials SET note=?, price_override=?, ord=?, product_id=?, date=? WHERE id=?', [note||'', price_override||'', ord||0, product_id||null, date||new Date().toISOString().slice(0,10), id], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// delete daily special
app.delete('/api/daily-specials/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM daily_specials WHERE id=?', [id], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// API: specials (templates) CRUD
app.get('/api/specials', (req, res) => {
  db.all('SELECT id, title, description, price, img, created_at FROM specials ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/specials', (req, res) => {
  const { title, description, price, img } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  db.run('INSERT INTO specials (title, description, price, img) VALUES (?,?,?,?)', [title, description||'', price||'', img||''], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/specials/:id', (req, res) => {
  const id = req.params.id; const { title, description, price, img } = req.body;
  db.run('UPDATE specials SET title=?, description=?, price=?, img=? WHERE id=?', [title, description||'', price||'', img||'', id], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.delete('/api/specials/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM specials WHERE id=?', [id], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// API: Promotions CRUD
app.get('/api/promotions', (req, res) => {
  db.all('SELECT * FROM promotions ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/promotions/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM promotions WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Promotion not found' });
    res.json(row);
  });
});

app.post('/api/promotions', (req, res) => {
  const { title, subtitle, badge_text, image_url } = req.body;
  if (!title || !subtitle) return res.status(400).json({ error: 'Title and subtitle required' });
  
  db.run('INSERT INTO promotions (title, subtitle, badge_text, image_url) VALUES (?,?,?,?)', 
    [title, subtitle, badge_text || '', image_url || ''], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/promotions/:id', (req, res) => {
  const id = req.params.id;
  const { title, subtitle, badge_text, image_url } = req.body;
  
  db.run('UPDATE promotions SET title=?, subtitle=?, badge_text=?, image_url=? WHERE id=?', 
    [title, subtitle, badge_text || '', image_url, id], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/promotions/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM promotions WHERE id=?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// create product
app.post('/api/products', (req,res) => {
  const { slug, title, description, price, img, category_slug } = req.body;
  if (!title) return res.status(400).json({error: 'title required'});
  db.get('SELECT id FROM categories WHERE slug = ?', [category_slug], (err, cat) => {
    const category_id = cat ? cat.id : null;
    const s = db.prepare('INSERT INTO products (slug, title, description, price, img, category_id) VALUES (?,?,?,?,?,?)');
    s.run(slug || title.toLowerCase().replace(/\s+/g,'-'), title, description, price, img, category_id, function(err){
      if (err) return res.status(500).json({error: err.message});
      res.json({id: this.lastID});
    });
  });
});

// update product
app.put('/api/products/:id', (req,res) => {
  const id = req.params.id;
  const { title, description, price, img, category_slug } = req.body;
  db.get('SELECT id FROM categories WHERE slug = ?', [category_slug], (err, cat) => {
    const category_id = cat ? cat.id : null;
    db.run('UPDATE products SET title=?, description=?, price=?, img=?, category_id=? WHERE id=?', [title, description, price, img, category_id, id], function(err){
      if (err) return res.status(500).json({error: err.message});
      res.json({changes: this.changes});
    });
  });
});

// delete product
app.delete('/api/products/:id', (req,res) => {
  const id = req.params.id;
  db.run('DELETE FROM products WHERE id=?', [id], function(err){
    if (err) return res.status(500).json({error: err.message});
    res.json({deleted: this.changes});
  });
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
