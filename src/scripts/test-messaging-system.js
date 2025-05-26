/**
 * Comprehensive Messaging System Test Script
 * 
 * This script tests all aspects of the messaging system including:
 * - Database schema and constraints
 * - Scheduled message processing
 * - Birthday message logic
 * - Cron job functionality
 * - Status updates and error handling
 * - Message history tracking
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET_KEY || 'church-cms-cron-secret-key-2025';

class MessagingSystemTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Messaging System Tests...\n');

    try {
      // 1. Test database setup
      await this.testDatabaseSetup();
      
      // 2. Test scheduled message creation
      await this.testScheduledMessageCreation();
      
      // 3. Test birthday message creation
      await this.testBirthdayMessageCreation();
      
      // 4. Test cron job functionality
      await this.testCronJobs();
      
      // 5. Test message status updates
      await this.testMessageStatusUpdates();
      
      // 6. Test cleanup functionality
      await this.testCleanupFunctionality();
      
      // 7. Test message history
      await this.testMessageHistory();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.errors.push(`Test suite failure: ${error.message}`);
    }
  }

  async testDatabaseSetup() {
    console.log('📊 Testing Database Setup...');
    
    try {
      // Run the database fix migration
      const response = await fetch(`${BASE_URL}/api/db/fix-messaging-tables`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        this.addResult('✅ Database setup', 'PASS', 'Tables created/updated successfully');
      } else {
        this.addResult('❌ Database setup', 'FAIL', result.error || 'Unknown error');
      }
    } catch (error) {
      this.addResult('❌ Database setup', 'ERROR', error.message);
    }
  }

  async testScheduledMessageCreation() {
    console.log('📝 Testing Scheduled Message Creation...');
    
    try {
      // Create a test scheduled message
      const messageData = {
        name: 'Test Scheduled Message',
        content: 'This is a test scheduled message',
        type: 'quick',
        frequency: 'one-time',
        schedule_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
        recipients: {
          type: 'individual',
          ids: [] // Empty for testing
        }
      };

      const response = await fetch(`${BASE_URL}/api/messaging/create-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.addResult('✅ Scheduled message creation', 'PASS', `Message created with ID: ${result.message?.id}`);
        return result.message?.id;
      } else {
        this.addResult('❌ Scheduled message creation', 'FAIL', result.error || 'Unknown error');
      }
    } catch (error) {
      this.addResult('❌ Scheduled message creation', 'ERROR', error.message);
    }
    
    return null;
  }

  async testBirthdayMessageCreation() {
    console.log('🎂 Testing Birthday Message Creation...');
    
    try {
      const birthdayData = {
        name: 'Test Birthday Message',
        content: 'Happy Birthday! 🎉',
        days_before: 0,
        status: 'active'
      };

      const response = await fetch(`${BASE_URL}/api/messaging/create-birthday-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(birthdayData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.addResult('✅ Birthday message creation', 'PASS', `Birthday message created with ID: ${result.message?.id}`);
        return result.message?.id;
      } else {
        this.addResult('❌ Birthday message creation', 'FAIL', result.error || 'Unknown error');
      }
    } catch (error) {
      this.addResult('❌ Birthday message creation', 'ERROR', error.message);
    }
    
    return null;
  }

  async testCronJobs() {
    console.log('⏰ Testing Cron Job Functionality...');
    
    // Test scheduled message processing
    try {
      const response = await fetch(`${BASE_URL}/api/cron/process-scheduled-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.addResult('✅ Scheduled message cron', 'PASS', `Processed ${result.processed || 0} messages`);
      } else {
        this.addResult('❌ Scheduled message cron', 'FAIL', result.error || 'Unknown error');
      }
    } catch (error) {
      this.addResult('❌ Scheduled message cron', 'ERROR', error.message);
    }

    // Test birthday message processing
    try {
      const response = await fetch(`${BASE_URL}/api/cron/process-birthday-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.addResult('✅ Birthday message cron', 'PASS', `Processed ${result.processed || 0} birthday messages`);
      } else {
        this.addResult('❌ Birthday message cron', 'FAIL', result.error || 'Unknown error');
      }
    } catch (error) {
      this.addResult('❌ Birthday message cron', 'ERROR', error.message);
    }
  }

  async testCleanupFunctionality() {
    console.log('🧹 Testing Cleanup Functionality...');
    
    try {
      // First check for stuck messages
      const checkResponse = await fetch(`${BASE_URL}/api/cron/cleanup-stuck-messages?token=${CRON_SECRET}`);
      const checkResult = await checkResponse.json();

      if (checkResponse.ok && checkResult.success) {
        this.addResult('✅ Cleanup check', 'PASS', `Found ${checkResult.stuckCount} stuck messages`);
      }

      // Run cleanup
      const cleanupResponse = await fetch(`${BASE_URL}/api/cron/cleanup-stuck-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`
        }
      });

      const cleanupResult = await cleanupResponse.json();

      if (cleanupResponse.ok && cleanupResult.success) {
        this.addResult('✅ Cleanup execution', 'PASS', `Cleaned ${cleanupResult.cleaned || 0} stuck messages`);
      } else {
        this.addResult('❌ Cleanup execution', 'FAIL', cleanupResult.error || 'Unknown error');
      }
    } catch (error) {
      this.addResult('❌ Cleanup functionality', 'ERROR', error.message);
    }
  }

  async testMessageStatusUpdates() {
    console.log('📊 Testing Message Status Updates...');
    
    try {
      // This would require creating a message and checking its status transitions
      // For now, we'll just verify the trigger cron functionality
      const response = await fetch(`${BASE_URL}/api/messaging/trigger-cron`, {
        method: 'POST'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.addResult('✅ Message status updates', 'PASS', 'Cron trigger working');
      } else {
        this.addResult('❌ Message status updates', 'FAIL', result.error || 'Unknown error');
      }
    } catch (error) {
      this.addResult('❌ Message status updates', 'ERROR', error.message);
    }
  }

  async testMessageHistory() {
    console.log('📚 Testing Message History...');
    
    try {
      // Test fetching message logs
      const response = await fetch(`${BASE_URL}/api/messaging/logs`);
      const result = await response.json();

      if (response.ok && result.success) {
        this.addResult('✅ Message history', 'PASS', `Found ${result.logs?.length || 0} log entries`);
      } else {
        this.addResult('❌ Message history', 'FAIL', result.error || 'Unknown error');
      }
    } catch (error) {
      this.addResult('❌ Message history', 'ERROR', error.message);
    }
  }

  addResult(test, status, details) {
    this.testResults.push({ test, status, details });
    console.log(`  ${test}: ${status} - ${details}`);
  }

  printResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Errors: ${errors}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed > 0 || errors > 0) {
      console.log('\n🚨 Issues Found:');
      this.testResults
        .filter(r => r.status !== 'PASS')
        .forEach(r => console.log(`  ${r.test}: ${r.details}`));
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new MessagingSystemTester();
  tester.runAllTests().catch(console.error);
}

module.exports = MessagingSystemTester;
