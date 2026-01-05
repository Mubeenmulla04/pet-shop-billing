require('dotenv').config();
const { pool } = require('../src/db');
const bcrypt = require('bcryptjs');

async function ensureDBReady() {
  console.log('🔍 Checking database connectivity...');
  
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    
    // Run migration to ensure tables exist
    console.log('🔄 Running database migrations...');
    const { runMigrations } = require('./migrate');
    await runMigrations();
    
    console.log('✅ Database is ready for use');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

ensureDBReady();