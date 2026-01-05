const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// This script reads migrations/init_postgres.sql and applies it to the PG database
// Requires env vars: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT (optional)

(async function(){
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'init_postgres.sql'), 'utf8');
    // normalize DATABASE_URL: trim and strip surrounding quotes if present
    let connStr = process.env.DATABASE_URL;
    if (!connStr || typeof connStr !== 'string') throw new Error('DATABASE_URL is not set or not a string');
    connStr = connStr.trim();
    if ((connStr.startsWith('"') && connStr.endsWith('"')) || (connStr.startsWith("'") && connStr.endsWith("'"))) {
      connStr = connStr.slice(1, -1);
    }

    function maskConn(s) {
      try {
        return s.replace(/(\/\/[^:]+:)([^@]+)(@)/, function(_, a, b, c){ return a + '****' + c; });
      } catch(e) { return 'DATABASE_URL=****'; }
    }

    // Try connecting with SSL first (common for hosted DBs). If the server does not support
    // SSL, retry without SSL to support local/dev Postgres instances.
    async function tryConnect(useSsl) {
      const opts = { connectionString: connStr };
      if (useSsl) opts.ssl = { rejectUnauthorized: false };
      const c = new Client(opts);
      await c.connect();
      return c;
    }

    let client;
    try {
      client = await tryConnect(true);
      console.log('Connected to Postgres with SSL, applying migration...');
    } catch (e) {
      const msg = (e && e.message) ? e.message : String(e);
      if (/does not support SSL|SSL error|no pg_hba|certificate/i.test(msg)) {
        console.warn('SSL connection failed, retrying without SSL...');
        client = await tryConnect(false);
        console.log('Connected to Postgres without SSL, applying migration...');
      } else {
        throw e;
      }
    }

    // Split into individual statements and run them sequentially to avoid driver limitations
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (e) {
        // log and continue when a statement fails (e.g., IF NOT EXISTS with concurrent runs)
        console.warn('Statement failed (continuing):', e.message || e);
      }
    }

    console.log('Migration applied (statements executed).');
    await client.end();
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
})();
