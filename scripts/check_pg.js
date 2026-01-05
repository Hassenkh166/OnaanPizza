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
    let conn = process.env.DATABASE_URL;
    if (!conn) throw new Error('DATABASE_URL not set in this session');
    conn = conn.trim();
    if ((conn.startsWith('"') && conn.endsWith('"')) || (conn.startsWith("'") && conn.endsWith("'"))) conn = conn.slice(1,-1);

    let client;
    try { client = await tryConnect(conn, true); console.log('Connected with SSL'); }
    catch(e){ console.warn('SSL connect failed, retrying without SSL'); client = await tryConnect(conn, false); console.log('Connected without SSL'); }

    const tables = ['categories','products','configuration','promotions','daily_specials','specials','reviews_snapshots'];
    for(const t of tables){
      try {
        const r = await client.query(`SELECT COUNT(*)::int as c FROM ${t}`);
        console.log(`${t}: ${r.rows[0].c} row(s)`);
      } catch(e){
        console.log(`${t}: (missing or error) ${e.message}`);
      }
    }

    // also list user tables
    const list = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('Public tables:', list.rows.map(r=>r.tablename).join(', ') || '(none)');

    await client.end();
  } catch (err){
    console.error('Check failed:', err.message || err);
    console.error('DATABASE_URL:', mask(process.env.DATABASE_URL || ''));
    process.exit(1);
  }
})();
