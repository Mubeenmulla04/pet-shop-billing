require('dotenv').config();
const { pool } = require('./src/db');

async function test() {
  try {
    console.log('Testing database connection...');
    
    // Check products table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `);
    
    console.log('\nProducts table columns:');
    columns.rows.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type}`);
    });
    
    // Try to fetch products
    const products = await pool.query('SELECT * FROM products LIMIT 1');
    console.log(`\nProducts count: ${products.rowCount}`);
    
    console.log('\n✅ Database connection successful!');
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
