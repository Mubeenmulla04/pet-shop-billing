require('dotenv').config();
const { pool } = require('./src/db');

async function clearBillHistory() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete all bill items first (due to foreign key)
    const billItemsResult = await client.query('DELETE FROM bill_items');
    console.log(`✅ Deleted ${billItemsResult.rowCount} bill items`);
    
    // Delete all bills
    const billsResult = await client.query('DELETE FROM bills');
    console.log(`✅ Deleted ${billsResult.rowCount} bills`);
    
    await client.query('COMMIT');
    console.log('\n✅ Bill history cleared successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

clearBillHistory();
