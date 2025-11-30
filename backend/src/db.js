const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    'DATABASE_URL is not set. Please define it in your .env file before starting the backend.'
  );
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.PGSSLMODE === 'require'
      ? { rejectUnauthorized: false }
      : undefined,
});

module.exports = {
  pool,
};

