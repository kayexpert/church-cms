/**
 * Fix Messaging System Script
 * 
 * This script fixes issues with the messaging system database schema.
 * Run it with: node scripts/fix-messaging-system.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('Starting messaging system fix script...');
  
  // Check if the app is running
  let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let isAppRunning = false;
  
  try {
    console.log(`Checking if app is running at ${appUrl}...`);
    const response = await fetch(appUrl);
    isAppRunning = response.ok;
    console.log(`App is ${isAppRunning ? 'running' : 'not running'}`);
  } catch (error) {
    console.log('App is not running:', error.message);
  }
  
  // If the app is not running, start it
  let appProcess = null;
  if (!isAppRunning) {
    console.log('Starting the app...');
    try {
      // Start the app in the background
      appProcess = require('child_process').spawn('npm', ['run', 'dev'], {
        detached: true,
        stdio: 'inherit'
      });
      
      // Wait for the app to start
      console.log('Waiting for the app to start...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check if the app is running now
      try {
        const response = await fetch(appUrl);
        isAppRunning = response.ok;
        console.log(`App is ${isAppRunning ? 'running' : 'still not running'}`);
        
        if (!isAppRunning) {
          console.error('Failed to start the app. Please start it manually and run this script again.');
          process.exit(1);
        }
      } catch (error) {
        console.error('Failed to start the app:', error.message);
        console.error('Please start it manually and run this script again.');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error starting the app:', error.message);
      console.error('Please start it manually and run this script again.');
      process.exit(1);
    }
  }
  
  // Call the API to fix the messaging system
  try {
    console.log('Calling the API to fix the messaging system...');
    const response = await fetch(`${appUrl}/api/db/fix-messaging-system`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      console.error('Failed to fix messaging system:', await response.text());
      process.exit(1);
    }
    
    const result = await response.json();
    console.log('Messaging system fix result:', result);
    
    // Wait a moment for the fix to complete
    console.log('Waiting for the fix to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Messaging system fix completed successfully!');
  } catch (error) {
    console.error('Error fixing messaging system:', error.message);
    process.exit(1);
  } finally {
    // If we started the app, kill it
    if (appProcess) {
      console.log('Stopping the app...');
      process.kill(-appProcess.pid);
    }
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
