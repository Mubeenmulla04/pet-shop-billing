const { Pool } = require('pg');

// In local development, DATABASE_URL comes from .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    'DATABASE_URL is not set. Please define it in your .env file before starting the backend.'
  );
}

// Configure SSL for local development
const sslConfig = process.env.PGSSLMODE === 'require'
  ? { rejectUnauthorized: false }
  : undefined;

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
});

module.exports = {
  pool,
};

