const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { neonConnectionOptions } = require('./neon');

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const client = new Client(neonConnectionOptions());

async function initializeDatabase() {
  try {
    await client.connect();
    await client.query(schema);
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('mmvy_users', 'mmvy_applications', 'mmvy_portal_access_events')
    `);
    if (tables.rowCount !== 3) {
      throw new Error('Schema initialization did not create all required MMVY portal tables.');
    }
    console.log('PostgreSQL schema is ready: mmvy_users, mmvy_applications, and mmvy_portal_access_events.');
  } finally {
    await client.end().catch(() => undefined);
  }
}

initializeDatabase().catch((error) => {
  console.error(`Database initialization failed: ${error.message}`);
  process.exitCode = 1;
});
