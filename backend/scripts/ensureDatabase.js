require('dotenv').config();
const { Pool } = require('pg');

function buildAdminConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Please provide it in the environment.');
  }

  // In local development, we might need to create the database
  // The DATABASE_URL might point to a database that doesn't exist yet
  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname.replace('/', ''));

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  // For local development, we might need to connect to postgres database to create our database
  url.pathname = '/postgres';
  const adminUrl = url.toString();

  const ssl =
    process.env.PGSSLMODE === 'require'
      ? { rejectUnauthorized: false }
      : undefined;

  return { adminUrl, databaseName, ssl };
}

function quoteIdentifier(name) {
  return `"${name.replace(/"/g, '"')}"`;
}

async function ensureDatabaseExists() {
  const { adminUrl, databaseName, ssl } = buildAdminConnection();
  const adminPool = new Pool({
    connectionString: adminUrl,
    ssl,
  });

  try {
    const client = await adminPool.connect();
    
    // Check if database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );
    
    if (result.rowCount === 0) {
      // Database doesn't exist, create it
      await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
      console.log(`Created database "${databaseName}".`);
    } else {
      console.log(`Database "${databaseName}" already exists.`);
    }
    
    client.release();
  } catch (error) {
    console.error('Failed to ensure database exists:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

module.exports = { ensureDatabaseExists };
