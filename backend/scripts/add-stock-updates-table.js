require('dotenv').config();
const { pool } = require('../src/db');
const { ensureDatabaseExists } = require('./ensureDatabase');

async function addStockUpdatesTable() {
  await ensureDatabaseExists();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create the stock_updates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_updates (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        old_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        updated_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Add a trigger function to automatically log stock updates
    await client.query(`
      CREATE OR REPLACE FUNCTION log_stock_update()
      RETURNS TRIGGER AS $$
      DECLARE
        admin_username TEXT;
      BEGIN
        -- Only log when stock actually changes
        IF OLD.stock IS DISTINCT FROM NEW.stock THEN
          -- Get the admin username from the session if available
          -- Since we can't access session in trigger, we'll set this from application code
          INSERT INTO stock_updates (product_id, old_stock, new_stock, updated_by)
          VALUES (NEW.id, OLD.stock, NEW.stock, 'admin');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query('COMMIT');
    console.log('Stock updates table created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to create stock updates table', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

addStockUpdatesTable();