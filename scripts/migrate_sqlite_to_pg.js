const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

function mask(s){ try { return s.replace(/(\/\/[^:]+:)([^@]+)(@)/, (_,a,b,c)=>a+'****'+c); } catch(e){ return 'DATABASE_URL=****'; } }

async function tryConnect(connStr, useSsl){
  const opts = { connectionString: connStr };
  if (useSsl) opts.ssl = { rejectUnauthorized: false };
  const c = new Client(opts);
  await c.connect();
  return c;
}

(async ()=>{
  try {
    const dbFile = path.join(__dirname, '..', 'data.db');
    if (!fs.existsSync(dbFile)) throw new Error('SQLite file not found: ' + dbFile);

    let conn = process.env.DATABASE_URL;
    if (!conn) throw new Error('Please set DATABASE_URL in this session before running this script');
    conn = conn.trim();
    if ((conn.startsWith('"') && conn.endsWith('"')) || (conn.startsWith("'") && conn.endsWith("'"))) conn = conn.slice(1,-1);

    const sqlite = new sqlite3.Database(dbFile);

    let pg;
    try { pg = await tryConnect(conn, true); console.log('Connected to Postgres with SSL'); }
    catch(e){ console.warn('SSL failed, retrying without SSL'); pg = await tryConnect(conn, false); console.log('Connected to Postgres without SSL'); }

    // helper to run an insert with ON CONFLICT DO NOTHING
    async function insertIgnore(table, cols, valuesArr) {
      if (!valuesArr || valuesArr.length === 0) return 0;
      const colList = cols.join(',');
      const params = valuesArr.map((v,i)=>`(${cols.map((_,j)=>`$${i*cols.length + j + 1}`).join(',')})`).join(',');
      const flat = valuesArr.flat();
      const sql = `INSERT INTO ${table} (${colList}) VALUES ${params} ON CONFLICT (id) DO NOTHING`;
      const res = await pg.query(sql, flat);
      return valuesArr.length;
    }

    // migrate categories
    const cats = await new Promise((resolve, reject)=>{ sqlite.all('SELECT * FROM categories', (e,r)=> e?reject(e):resolve(r)); });
    if (cats.length) {
      const cols = ['id','slug','name','icon','display_order'];
      const vals = cats.map(c=>[c.id, c.slug, c.name, c.icon || '', c.display_order || 0]);
      await insertIgnore('categories', cols, vals);
      console.log(`Migrated ${vals.length} categories`);
    }

    // migrate configuration (single row)
    const confs = await new Promise((resolve, reject)=>{ sqlite.all('SELECT * FROM configuration', (e,r)=> e?reject(e):resolve(r)); });
    if (confs.length) {
      const c = confs[0];
      const cols = ['id','theme','hero_images','logo','restaurant_name','about_images','primary_color','secondary_color','accent_color','contact_address','contact_phone','contact_email','contact_hours'];
      const vals = [[c.id, c.theme || 'default', c.hero_images || '[]', c.logo || '/assets/images/logo.png', c.restaurant_name || "O'naan Pizza", c.about_images || '[]', c.primary_color || '#C41E3A', c.secondary_color || '#FF6B35', c.accent_color || '#FFD700', c.contact_address || '', c.contact_phone || '', c.contact_email || '', c.contact_hours || '']];
      await insertIgnore('configuration', cols, vals);
      console.log('Migrated configuration');
    }

    // migrate products
    const products = await new Promise((resolve, reject)=>{ sqlite.all('SELECT * FROM products', (e,r)=> e?reject(e):resolve(r)); });
    if (products.length) {
      // keep schema columns that exist in Postgres
      const cols = ['id','slug','title','description','price','img','category_id','badge','bread_types','is_spicy','is_new','is_popular','is_customizable','available_supplements'];
      const vals = products.map(p=>[
        p.id, p.slug, p.title, p.description, p.price, p.img, p.category_id || null, p.badge || '', p.bread_types || '[]', p.is_spicy || 0, p.is_new || 0, p.is_popular || 0, p.is_customizable || 0, p.available_supplements || '[]'
      ]);
      await insertIgnore('products', cols, vals);
      console.log(`Migrated ${vals.length} products`);
    }

    // migrate promotions
    const promos = await new Promise((resolve, reject)=>{ sqlite.all('SELECT * FROM promotions', (e,r)=> e?reject(e):resolve(r)); });
    if (promos.length) {
      const cols = ['id','title','subtitle','badge_text','image_url','created_at'];
      const vals = promos.map(p=>[p.id, p.title, p.subtitle || '', p.badge_text || '', p.image_url || '', p.created_at || null]);
      await insertIgnore('promotions', cols, vals);
      console.log(`Migrated ${vals.length} promotions`);
    }

    // migrate specials
    const specials = await new Promise((resolve, reject)=>{ sqlite.all('SELECT * FROM specials', (e,r)=> e?reject(e):resolve(r)); });
    if (specials.length) {
      const cols = ['id','title','description','price','img','created_at'];
      const vals = specials.map(s=>[s.id, s.title, s.description || '', s.price || '', s.img || '', s.created_at || null]);
      await insertIgnore('specials', cols, vals);
      console.log(`Migrated ${vals.length} specials`);
    }

    // migrate daily_specials
    const ds = await new Promise((resolve, reject)=>{ sqlite.all('SELECT * FROM daily_specials', (e,r)=> e?reject(e):resolve(r)); });
    if (ds.length) {
      const cols = ['id','product_id','special_id','note','price_override','ord','date'];
      const vals = ds.map(d=>[d.id, d.product_id || null, d.special_id || null, d.note || '', d.price_override || '', d.ord || 0, d.date || null]);
      await insertIgnore('daily_specials', cols, vals);
      console.log(`Migrated ${vals.length} daily_specials`);
    }

    // migrate reviews_snapshots
    const revs = await new Promise((resolve, reject)=>{ sqlite.all('SELECT * FROM reviews_snapshots', (e,r)=> e?reject(e):resolve(r)); });
    if (revs.length) {
      const cols = ['id','provider','place_id','fetched_at','avg_rating','total_reviews','reviews_json'];
      const vals = revs.map(r=>[r.id, r.provider, r.place_id, r.fetched_at || null, r.avg_rating || null, r.total_reviews || 0, r.reviews_json || '[]']);
      await insertIgnore('reviews_snapshots', cols, vals);
      console.log(`Migrated ${vals.length} reviews_snapshots`);
    }

    // adjust serial sequences to max(id)
    const tables = ['categories','products','configuration','promotions','specials','daily_specials','reviews_snapshots'];
    for(const t of tables){
      try {
        const seqRes = await pg.query(`SELECT pg_get_serial_sequence($1, 'id') as seq`, [t]);
        const seq = seqRes.rows[0].seq;
        if (seq) {
          const maxRes = await pg.query(`SELECT COALESCE(MAX(id),0) as m FROM ${t}`);
          const maxId = maxRes.rows[0].m || 0;
          await pg.query(`SELECT setval($1, $2, true)`, [seq, Math.max(1, maxId)]);
          console.log(`Adjusted sequence for ${t} to ${maxId}`);
        }
      } catch(e){ /* ignore */ }
    }

    await pg.end();
    sqlite.close();
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    console.error('DATABASE_URL:', mask(process.env.DATABASE_URL || ''));
    process.exit(1);
  }
})();
