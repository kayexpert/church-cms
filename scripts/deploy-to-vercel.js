#!/usr/bin/env node

/**
 * Deployment script for Church CMS to Vercel
 * Handles pre-deployment checks and deployment process
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Church CMS Deployment to Vercel');
console.log('===================================\n');

// Check if required files exist
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'next.config.ts',
    'vercel.json',
    '.env.example',
    'DEPLOYMENT-GUIDE.md'
  ];

  console.log('📋 Checking required files...');
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      console.error(`❌ Missing required file: ${file}`);
      return false;
    }
  }
  
  console.log('✅ All required files present\n');
  return true;
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log('🔧 Checking environment variables...');
  
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env.local not found - make sure to configure environment variables in Vercel');
    return true;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_API_SECRET_KEY',
    'CRON_SECRET_KEY'
  ];

  const missingVars = [];
  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('   Make sure to add these in Vercel dashboard');
  } else {
    console.log('✅ All required environment variables found');
  }
  
  console.log('');
  return true;
}

// Test build
function testBuild() {
  return new Promise((resolve) => {
    console.log('🏗️  Testing build...');
    
    const build = spawn('npm', ['run', 'build'], { 
      stdio: 'pipe',
      shell: true 
    });

    let output = '';
    build.stdout.on('data', (data) => {
      output += data.toString();
    });

    build.stderr.on('data', (data) => {
      output += data.toString();
    });

    build.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build successful!\n');
        resolve(true);
      } else {
        console.error('❌ Build failed!');
        console.error('Build output:', output);
        resolve(false);
      }
    });
  });
}

// Display deployment instructions
function displayDeploymentInstructions() {
  console.log('📖 Deployment Instructions');
  console.log('==========================\n');
  
  console.log('🔧 Environment Variables to set in Vercel Dashboard:');
  console.log('');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key');
  console.log('NEXT_PUBLIC_API_SECRET_KEY=your-production-api-secret');
  console.log('CRON_SECRET_KEY=your-production-cron-secret');
  console.log('');
  console.log('# Optional (for enhanced security):');
  console.log('ADMIN_EMAILS=admin@church.com,pastor@church.com');
  console.log('ENABLE_RATE_LIMITING=true');
  console.log('SECURITY_HEADERS=true');
  console.log('NODE_ENV=production');
  console.log('');
  
  console.log('🚀 Deployment Options:');
  console.log('');
  console.log('Option 1: Vercel CLI (Recommended)');
  console.log('  1. Install Vercel CLI: npm install -g vercel');
  console.log('  2. Login: vercel login');
  console.log('  3. Deploy: vercel --prod');
  console.log('');
  console.log('Option 2: GitHub Integration');
  console.log('  1. Push code to GitHub');
  console.log('  2. Connect repository in Vercel dashboard');
  console.log('  3. Configure environment variables');
  console.log('  4. Deploy automatically');
  console.log('');
  
  console.log('📋 Post-Deployment Checklist:');
  console.log('  □ Test authentication (login/logout)');
  console.log('  □ Verify database connections');
  console.log('  □ Check all main features');
  console.log('  □ Test SMS functionality (if configured)');
  console.log('  □ Verify cron jobs are working');
  console.log('  □ Check for console errors');
  console.log('  □ Test mobile responsiveness');
  console.log('');
}

// Check if Vercel CLI is installed
function checkVercelCLI() {
  return new Promise((resolve) => {
    const vercel = spawn('vercel', ['--version'], { 
      stdio: 'pipe',
      shell: true 
    });

    vercel.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Vercel CLI is installed');
        resolve(true);
      } else {
        console.log('⚠️  Vercel CLI not found');
        console.log('   Install with: npm install -g vercel');
        resolve(false);
      }
    });
  });
}

// Offer to deploy with Vercel CLI
function offerVercelDeploy() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Would you like to deploy now with Vercel CLI? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Deploy with Vercel CLI
function deployWithVercel() {
  return new Promise((resolve) => {
    console.log('🚀 Deploying to Vercel...\n');
    
    const deploy = spawn('vercel', ['--prod'], { 
      stdio: 'inherit',
      shell: true 
    });

    deploy.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 Deployment successful!');
        console.log('📋 Don\'t forget to:');
        console.log('   1. Configure environment variables in Vercel dashboard');
        console.log('   2. Test the deployed application');
        console.log('   3. Follow the post-deployment checklist');
      } else {
        console.log('\n❌ Deployment failed');
        console.log('   Check the error messages above');
        console.log('   You may need to configure environment variables first');
      }
      resolve(code === 0);
    });
  });
}

// Main deployment process
async function main() {
  console.log('🎯 Starting pre-deployment checks...\n');
  
  // Run pre-deployment checks
  if (!checkRequiredFiles()) {
    console.error('❌ Pre-deployment checks failed');
    process.exit(1);
  }
  
  if (!checkEnvironmentVariables()) {
    console.error('❌ Environment variable check failed');
    process.exit(1);
  }
  
  // Test build
  const buildSuccess = await testBuild();
  if (!buildSuccess) {
    console.error('❌ Build test failed - fix build errors before deploying');
    process.exit(1);
  }
  
  console.log('✅ All pre-deployment checks passed!\n');
  
  // Check for Vercel CLI
  const hasVercelCLI = await checkVercelCLI();
  
  // Display instructions
  displayDeploymentInstructions();
  
  // Offer to deploy if CLI is available
  if (hasVercelCLI) {
    const shouldDeploy = await offerVercelDeploy();
    if (shouldDeploy) {
      await deployWithVercel();
    } else {
      console.log('👍 Deployment preparation complete!');
      console.log('   Follow the instructions above to deploy manually');
    }
  } else {
    console.log('👍 Deployment preparation complete!');
    console.log('   Install Vercel CLI or use GitHub integration to deploy');
  }
  
  console.log('\n📚 Additional Resources:');
  console.log('   - DEPLOYMENT-GUIDE.md - Detailed deployment guide');
  console.log('   - SECURITY-CHECKLIST.md - Security deployment checklist');
  console.log('   - PRODUCTION-READINESS-REPORT.md - Full readiness assessment');
}

main().catch(console.error);
