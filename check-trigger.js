require("dotenv").config();

const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

async function main() {
  await client.connect();

  const result = await client.query(`
    SELECT
      trigger_name,
      event_manipulation,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'mmvy_users'
    ORDER BY trigger_name;
  `);

  console.table(result.rows);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});