require('dotenv').config();
const bcrypt = require('bcryptjs');

// For Vercel deployments, we need to dynamically import db
let pool;

async function getDb() {
  if (!pool) {
    const dbModule = await import('../src/db');
    pool = dbModule.pool;
  }
  return pool;
}

async function runMigrations() {
  // Skip migrations in Vercel environment as they should be run manually
  if (process.env.VERCEL) {
    console.log('Skipping migrations in Vercel environment. Run manually if needed.');
    return;
  }

  const { ensureDatabaseExists } = await import('./ensureDatabase');
  await ensureDatabaseExists();

  const db = await getDb();
  const client = await db.connect();

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
        `Created default admin "${defaultAdminUsername}". Please update the password after logging in.`
      );
    }

    await client.query('COMMIT');
    console.log('Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed', error);
    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }
    const db = await getDb();
    await db.end();
  }
}

runMigrations();
