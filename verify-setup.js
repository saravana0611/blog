#!/usr/bin/env node

/**
 * Setup Verification Script
 * This script helps verify that your local setup is working correctly
 */

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Tech Blog Platform - Setup Verification');
console.log('==========================================\n');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }
}

function checkEnvironment() {
  log('\n📋 Checking Environment Files...', 'blue');
  
  const envExists = checkFile('.env', 'Environment file (.env)');
  const envExampleExists = checkFile('env.example', 'Environment example file');
  
  if (envExists) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const hasDbPassword = envContent.includes('DB_PASSWORD=') && !envContent.includes('your_password_here');
    const hasJwtSecret = envContent.includes('JWT_SECRET=') && !envContent.includes('your_super_secret_jwt_key_here');
    
    if (hasDbPassword) {
      log('✅ Database password configured', 'green');
    } else {
      log('⚠️  Database password needs to be updated in .env', 'yellow');
    }
    
    if (hasJwtSecret) {
      log('✅ JWT secret configured', 'green');
    } else {
      log('⚠️  JWT secret needs to be updated in .env', 'yellow');
    }
  }
  
  return envExists;
}

function checkDependencies() {
  log('\n📦 Checking Dependencies...', 'blue');
  
  const nodeModulesExists = checkFile('node_modules', 'Node.js dependencies (node_modules)');
  const clientNodeModulesExists = checkFile('client/node_modules', 'React dependencies (client/node_modules)');
  const packageJsonExists = checkFile('package.json', 'Root package.json');
  const clientPackageJsonExists = checkFile('client/package.json', 'Client package.json');
  
  return nodeModulesExists && clientNodeModulesExists && packageJsonExists && clientPackageJsonExists;
}

function checkDatabase() {
  log('\n🗄️  Checking Database Connection...', 'blue');
  
  return new Promise((resolve) => {
    // Try to read .env file for database config
    if (!fs.existsSync('.env')) {
      log('❌ Cannot check database - .env file not found', 'red');
      resolve(false);
      return;
    }
    
    const envContent = fs.readFileSync('.env', 'utf8');
    const dbMatch = envContent.match(/DB_NAME=([^\r\n]+)/);
    
    if (!dbMatch) {
      log('❌ Database name not found in .env', 'red');
      resolve(false);
      return;
    }
    
    const dbName = dbMatch[1];
    
    // Try to connect to PostgreSQL
    exec(`psql -h localhost -U postgres -d ${dbName} -c "SELECT 1;"`, (error, stdout, stderr) => {
      if (error) {
        log(`❌ Database connection failed: ${error.message}`, 'red');
        log('   Make sure PostgreSQL is running and credentials are correct', 'yellow');
        resolve(false);
      } else {
        log(`✅ Database connection successful (${dbName})`, 'green');
        resolve(true);
      }
    });
  });
}

function checkServer(port, name) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      log(`✅ ${name} is running on port ${port}`, 'green');
      resolve(true);
    });
    
    req.on('error', (err) => {
      log(`❌ ${name} is not running on port ${port}`, 'red');
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      log(`❌ ${name} connection timeout on port ${port}`, 'red');
      resolve(false);
    });
  });
}

function checkServers() {
  log('\n🌐 Checking Running Servers...', 'blue');
  
  return Promise.all([
    checkServer(5000, 'Backend API'),
    checkServer(3000, 'Frontend React App')
  ]);
}

function checkPythonSetup() {
  log('\n🐍 Checking Python Setup...', 'blue');
  
  const venvExists = checkFile('venv', 'Python virtual environment');
  const requirementsExists = checkFile('requirements.txt', 'Python requirements file');
  const pythonBackendExists = checkFile('start_python_backend.py', 'Python backend starter');
  
  if (venvExists) {
    log('✅ Python virtual environment found', 'green');
  } else {
    log('⚠️  Python virtual environment not found - run: python -m venv venv', 'yellow');
  }
  
  return venvExists && requirementsExists && pythonBackendExists;
}

async function main() {
  let allChecksPassed = true;
  
  // Check environment
  const envOk = checkEnvironment();
  if (!envOk) allChecksPassed = false;
  
  // Check dependencies
  const depsOk = checkDependencies();
  if (!depsOk) allChecksPassed = false;
  
  // Check database
  const dbOk = await checkDatabase();
  if (!dbOk) allChecksPassed = false;
  
  // Check Python setup
  const pythonOk = checkPythonSetup();
  
  // Check running servers
  const [backendOk, frontendOk] = await checkServers();
  if (!backendOk || !frontendOk) allChecksPassed = false;
  
  // Summary
  log('\n📊 Setup Verification Summary', 'bold');
  log('==============================', 'bold');
  
  if (allChecksPassed) {
    log('\n🎉 All checks passed! Your setup is ready to go!', 'green');
    log('\nNext steps:', 'blue');
    log('1. Open http://localhost:3000 in your browser', 'reset');
    log('2. Register a new account', 'reset');
    log('3. Create your first blog post!', 'reset');
  } else {
    log('\n⚠️  Some checks failed. Please review the issues above.', 'yellow');
    log('\nCommon solutions:', 'blue');
    log('1. Make sure PostgreSQL is running', 'reset');
    log('2. Update .env file with correct database credentials', 'reset');
    log('3. Run: npm run install:all', 'reset');
    log('4. Run: npm run dev (for Node.js backend)', 'reset');
    log('5. Or run: python start_python_backend.py (for Python backend)', 'reset');
  }
  
  log('\n📚 For detailed setup instructions, see LOCAL_SETUP_GUIDE.md', 'blue');
}

// Run the verification
main().catch(console.error);
