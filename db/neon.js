const neonHostSuffix = '.neon.tech';

function getNeonDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required and must be a Neon PostgreSQL connection string.');
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid Neon PostgreSQL connection string.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname.endsWith(neonHostSuffix)) {
    throw new Error('DATABASE_URL must point to a Neon database (*.neon.tech). Local PostgreSQL connections are not supported.');
  }

  return databaseUrl;
}

function neonConnectionOptions() {
  const connection = new URL(getNeonDatabaseUrl());
  connection.searchParams.set('sslmode', 'verify-full');

  return {
    connectionString: connection.toString(),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10_000),
    ssl: { rejectUnauthorized: true }
  };
}

module.exports = { getNeonDatabaseUrl, neonConnectionOptions };
