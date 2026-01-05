const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// This script reads migrations/init_postgres.sql and applies it to the PG database
// Requires env vars: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT (optional)

(async function(){
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'init_postgres.sql'), 'utf8');
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('Connected to Postgres, applying migration...');

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
