require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');
const { ensureDatabaseExists } = require('./ensureDatabase');

async function runMigrations() {
  await ensureDatabaseExists();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        customer_name TEXT NOT NULL,
        total NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_mode TEXT DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'online')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price NUMERIC(10,2) NOT NULL CHECK (price >= 0)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const defaultAdminUsername =
      process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const defaultAdminPassword =
      process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

    // Check if admin user already exists
    const existingAdmin = await client.query(
      'SELECT id FROM admins WHERE username = $1',
      [defaultAdminUsername]
    );

    if (existingAdmin.rowCount === 0) {
      const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);
      await client.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        [defaultAdminUsername, passwordHash]
      );
      console.log(
        `Created default admin "${defaultAdminUsername}" with password "${defaultAdminPassword}". Please update the password after logging in.`
      );
    } else {
      console.log(
        `Admin "${defaultAdminUsername}" already exists.`
      );
    }

    await client.query('COMMIT');
    console.log('Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed', error);
    // Don't exit process to allow server to start anyway
    process.exitCode = 0;
  } finally {
    client.release();
    await pool.end();
  }
}

// Only run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
