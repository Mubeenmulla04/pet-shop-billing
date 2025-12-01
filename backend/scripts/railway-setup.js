#!/usr/bin/env node
// Railway-specific setup script
require('dotenv').config();
const { ensureDatabaseExists } = require('./ensureDatabase');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function railwaySetup() {
  console.log('🚀 Starting Railway setup...\n');
  
  try {
    // Ensure database exists
    await ensureDatabaseExists();
    console.log('✅ Database ensured\n');
    
    // Run migrations
    const migrateScript = path.join(__dirname, 'migrate.js');
    const migrateExists = await fs.access(migrateScript).then(() => true).catch(() => false);
    
    if (migrateExists) {
      console.log('📋 Running database migrations...');
      const { spawnSync } = require('child_process');
      const result = spawnSync('node', [migrateScript], { 
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
      });
      
      if (result.status === 0) {
        console.log('✅ Database migrations completed!\n');
      } else {
        throw new Error('Database migration failed');
      }
    } else {
      console.log('⚠️  No migration script found\n');
    }
    
    console.log('🎉 Railway setup completed successfully!\n');
  } catch (error) {
    console.error('❌ Railway setup failed:', error.message);
    process.exit(1);
  }
}

// Only run if this script is called directly
if (require.main === module) {
  railwaySetup();
}

module.exports = { railwaySetup };