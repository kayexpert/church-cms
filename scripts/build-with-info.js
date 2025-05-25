#!/usr/bin/env node

console.log('🏗️  Building Church CMS...');
console.log('========================\n');

const { spawn } = require('child_process');

const build = spawn('npm', ['run', 'build'], { 
  stdio: 'inherit',
  shell: true 
});

build.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Build successful!');
    console.log('🚀 Ready for deployment to Vercel');
  } else {
    console.log('\n❌ Build failed!');
    console.log('📋 Common fixes:');
    console.log('   1. Run: node scripts/fix-build-errors.js');
    console.log('   2. Or manually fix TypeScript/ESLint errors');
    console.log('   3. Check DEPLOYMENT-GUIDE.md for help');
  }
});
