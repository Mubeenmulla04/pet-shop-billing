require('dotenv').config();
const { Pool } = require('pg');

function buildAdminConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Please provide it in the environment.');
  }

  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname.replace('/', ''));

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';

  const ssl =
    process.env.PGSSLMODE === 'require'
      ? { rejectUnauthorized: false }
      : undefined;

  return { adminUrl: adminUrl.toString(), databaseName, ssl };
}

function quoteIdentifier(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const { adminUrl, databaseName, ssl } = buildAdminConnection();
  const adminPool = new Pool({
    connectionString: adminUrl,
    ssl,
  });

  try {
    const exists = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (exists.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
      console.log(`Created database "${databaseName}".`);
    } else {
      console.log(`Database "${databaseName}" already exists.`);
    }
  } finally {
    await adminPool.end();
  }
}

module.exports = { ensureDatabaseExists };

