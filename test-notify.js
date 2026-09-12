require("dotenv").config();

const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

async function main() {
  await client.connect();

  client.on("notification", (msg) => {
    console.log("NOTIFICATION RECEIVED:");
    console.log("CHANNEL:", msg.channel);
    console.log("PAYLOAD:", msg.payload);
  });

  await client.query("LISTEN mmvy_mahasetu_cdc");

  console.log("Listening on mmvy_mahasetu_cdc...");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});