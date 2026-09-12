const neonHostSuffix = '.neon.tech';

function getNeonDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required and must be a Neon PostgreSQL connection string.'
    );
  }

  let parsed;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      'DATABASE_URL must be a valid Neon PostgreSQL connection string.'
    );
  }

  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !parsed.hostname.endsWith(neonHostSuffix)
  ) {
    throw new Error(
      'DATABASE_URL must point to a Neon database (*.neon.tech).'
    );
  }

  return databaseUrl;
}

function neonConnectionOptions() {
  const connection = new URL(getNeonDatabaseUrl());

  connection.searchParams.set('sslmode', 'verify-full');

  return {
    connectionString: connection.toString(),

    // Neon can terminate idle connections.
    // Keep the pool small and discard idle connections quickly.
    max: 5,
    idleTimeoutMillis: 10000,

    // Give Neon enough time to wake/connect.
    connectionTimeoutMillis: 15000,

    // Don't keep a connection around forever.
    maxLifetimeSeconds: 60,

    ssl: {
      rejectUnauthorized: true
    }
  };
}

module.exports = {
  getNeonDatabaseUrl,
  neonConnectionOptions
};