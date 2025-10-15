/**
 * Test script for AgriLink Report Validation System
 * Run this in browser console to test the report functionality
 */

// Test data for reports
const testReports = [
  {
    reportType: "spam",
    postContent: "BUY NOW! AMAZING FERTILIZER! CLICK HERE FOR DISCOUNT! LIMITED TIME OFFER!",
    description: "This is clearly spam advertising",
    expected: "VALID"
  },
  {
    reportType: "misinformation", 
    postContent: "Drinking bleach will cure plant diseases and make your crops grow faster",
    description: "This is dangerous misinformation",
    expected: "VALID"
  },
  {
    reportType: "harassment",
    postContent: "I disagree with your farming method. Have you considered crop rotation?",
    description: "This person disagreed with me",
    expected: "INVALID"
  },
  {
    reportType: "fraud",
    postContent: "Selling organic certified seeds. 100% guaranteed results or money back!",
    description: "Seems like a legitimate business offer",
    expected: "INVALID"
  }
];

// Function to test n8n webhook directly
async function testN8nWebhook(reportData) {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  
  if (!webhookUrl || webhookUrl === 'https://your-n8n-instance.com/webhook/report-validation') {
    console.log('❌ N8N webhook URL not configured');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId: `test_${Date.now()}`,
        reporterId: 'test_user_1',
        reportedUserId: 'test_user_2',
        postId: 'test_post_1',
        reportType: reportData.reportType,
        description: reportData.description,
        postContent: reportData.postContent,
        postAuthor: 'Test User',
        reporterName: 'Test Reporter',
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ N8N webhook test successful:', result);
      return true;
    } else {
      console.log('❌ N8N webhook failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ N8N webhook error:', error);
    return false;
  }
}

// Function to test Firebase connection
async function testFirebaseConnection() {
  try {
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined' && typeof window.firebase === 'undefined') {
      console.log('❌ Firebase not loaded');
      return false;
    }

    // Try to access Firestore
    const db = firebase?.firestore?.() || window.firebase?.firestore?.();
    if (!db) {
      console.log('❌ Firestore not available');
      return false;
    }

    console.log('✅ Firebase connection available');
    return true;
  } catch (error) {
    console.log('❌ Firebase connection error:', error);
    return false;
  }
}

// Function to test report modal functionality
function testReportModal() {
  try {
    // Check if report modal functions exist
    const dashboard = document.querySelector('[data-testid="dashboard"]') || document.body;
    
    // Look for report button
    const reportButtons = document.querySelectorAll('button');
    const reportButton = Array.from(reportButtons).find(btn => 
      btn.textContent.includes('Report') || btn.textContent.includes('report')
    );

    if (reportButton) {
      console.log('✅ Report button found');
      return true;
    } else {
      console.log('❌ Report button not found');
      return false;
    }
  } catch (error) {
    console.log('❌ Report modal test error:', error);
    return false;
  }
}

// Main test function
async function runReportSystemTests() {
  console.log('🚀 Starting AgriLink Report System Tests...\n');

  const results = {
    firebase: await testFirebaseConnection(),
    modal: testReportModal(),
    webhook: false
  };

  // Test webhook if configured
  if (testReports.length > 0) {
    console.log('\n📡 Testing N8N webhook...');
    results.webhook = await testN8nWebhook(testReports[0]);
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`Firebase Connection: ${results.firebase ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Report Modal: ${results.modal ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`N8N Webhook: ${results.webhook ? '✅ PASS' : '❌ FAIL'}`);

  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);

  if (passCount === totalTests) {
    console.log('🎉 All tests passed! Report system is functional.');
  } else {
    console.log('⚠️ Some tests failed. Check configuration and setup.');
  }

  return results;
}

// Auto-run tests if this script is executed
if (typeof window !== 'undefined') {
  console.log('AgriLink Report System Test Script Loaded');
  console.log('Run runReportSystemTests() to start testing');
  
  // Make functions available globally for manual testing
  window.testReportSystem = {
    runTests: runReportSystemTests,
    testN8nWebhook,
    testFirebaseConnection,
    testReportModal,
    testData: testReports
  };
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runReportSystemTests,
    testN8nWebhook,
    testFirebaseConnection,
    testReportModal,
    testReports
  };
}

/**
 * Usage Instructions:
 * 
 * 1. Open your AgriLink dashboard in browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: runReportSystemTests()
 * 
 * Or test individual components:
 * - testReportSystem.testFirebaseConnection()
 * - testReportSystem.testN8nWebhook(testReportSystem.testData[0])
 * - testReportSystem.testReportModal()
 */
