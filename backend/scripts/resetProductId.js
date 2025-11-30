require('dotenv').config();
const { pool } = require('../src/db');

async function resetProductIdSequence() {
  try {
    await pool.query('ALTER SEQUENCE products_id_seq RESTART WITH 1');
    console.log('✅ Product ID sequence reset successfully. Next product will have ID = 1');
  } catch (error) {
    console.error('❌ Error resetting sequence:', error.message);
  } finally {
    await pool.end();
  }
}

resetProductIdSequence();
