const { Pool } = require('pg');

// In Railway, DATABASE_URL is automatically set by the PostgreSQL service
// In local development, it comes from .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    'DATABASE_URL is not set. Please define it in your .env file before starting the backend.'
  );
}

// Configure SSL for Railway PostgreSQL
const sslConfig = process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: false } 
  : process.env.PGSSLMODE === 'require'
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
});

module.exports = {
  pool,
};

