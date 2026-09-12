require("dotenv").config();
const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: true }
});

async function test() {
  try {
    console.log("Connecting to Neon...");
    await client.connect();
    console.log("CONNECTED");

    const result = await client.query("SELECT NOW() AS now");
    console.log("DATABASE RESPONSE:", result.rows[0]);

    await client.end();
    console.log("Connection closed.");
  } catch (error) {
    console.error("DB TEST FAILED:");
    console.error(error);
    try { await client.end(); } catch {}
    process.exit(1);
  }
}

test();
