require('dotenv').config();
const { pool } = require('./src/db');

async function addMissingColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Adding missing columns to database...\n');
    
    // Add image_url to products if it doesn't exist
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS image_url TEXT
    `);
    console.log('✅ Added image_url column to products table');
    
    // Add payment_mode to bills if it doesn't exist
    await client.query(`
      ALTER TABLE bills 
      ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash' 
      CHECK (payment_mode IN ('cash', 'online'))
    `);
    console.log('✅ Added payment_mode column to bills table');
    
    console.log('\n✅ All columns added successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns();
