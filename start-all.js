#!/usr/bin/env node

// In production environments, we don't need to run the full development stack
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Starting Pet Shop Billing Application in Production Mode...');
  console.log('Starting backend server only...');
  
  // Just start the backend server
  const { spawn } = require('child_process');
  const backendProcess = spawn('node', ['src/index.js'], { 
    cwd: './backend',
    stdio: 'inherit',
    shell: true
  });
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down services...');
    backendProcess.kill();
    process.exit(0);
  });
  
  return;
}

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Pet Shop Billing Application...\n');

// Function to execute a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { 
      cwd: options.cwd || process.cwd(),
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    // 1. Run database migration
    console.log('📋 Running database migration...');
    await runCommand('node', ['scripts/migrate.js'], { cwd: path.join(__dirname, 'backend') });
    console.log('✅ Database migration completed!\n');

    // 2. Start backend server
    console.log('🔧 Starting backend server...');
    const backendProcess = spawn('node', ['src/index.js'], { 
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
      shell: true
    });

    // Give backend time to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Start frontend development server
    console.log('\n🎨 Starting frontend development server...');
    const frontendProcess = spawn('npm', ['run', 'dev'], { 
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true
    });

    console.log('\n🎉 Application started successfully!');
    console.log('📱 Frontend: http://localhost:5173');
    console.log('🔧 Backend: http://localhost:4000');
    console.log('\nPress Ctrl+C to stop all services\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down services...');
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error starting application:', error.message);
    process.exit(1);
  }
}

main();