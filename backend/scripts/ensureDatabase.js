require('dotenv').config();
const { Pool } = require('pg');

function buildAdminConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Please provide it in the environment.');
  }

  // In Railway, we don't need to create databases - they're already provided
  // The DATABASE_URL already points to the specific database
  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname.replace('/', ''));

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  // For Railway, we can directly connect to the provided database
  // No need to switch to postgres database for creation
  const ssl =
    process.env.PGSSLMODE === 'require'
      ? { rejectUnauthorized: false }
      : undefined;

  return { 
    adminUrl: connectionString, // Use the direct connection in Railway
    databaseName, 
    ssl 
  };
}

function quoteIdentifier(name) {
  return `"${name.replace(/"/g, '"')}"`;
}

async function ensureDatabaseExists() {
  // In Railway, the database is already provisioned
  // We just need to verify we can connect
  const { adminUrl, databaseName, ssl } = buildAdminConnection();
  const adminPool = new Pool({
    connectionString: adminUrl,
    ssl,
  });

  try {
    // Test connection
    const client = await adminPool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log(`Connected to database "${databaseName}".`);
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

module.exports = { ensureDatabaseExists };
