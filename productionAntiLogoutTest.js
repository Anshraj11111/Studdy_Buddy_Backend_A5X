import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Production URLs
const PRODUCTION_API = 'https://studdy-buddy-backend-a5x.onrender.com/api';
const LOCAL_API = 'http://localhost:5000/api';

console.log('\n🚀 PRODUCTION ANTI-LOGOUT SYSTEM TEST');
console.log('═'.repeat(80));

async function testProductionAuth() {
  const testScenarios = [
    {
      name: '🔐 Test 1: Login with Real Student',
      test: async () => {
        try {
          const response = await axios.post(`${PRODUCTION_API}/auth/login`, {
            email: 'pragyan.soni@student.com',
            password: 'password123',
            role: 'student',
            schoolPassword: 'E028RBPE'
          });
          
          const { token, user } = response.data.data;
          console.log('✅ Login successful');
          console.log('   User:', user.name);
          console.log('   Token length:', token.length);
          console.log('   School access:', user.hasFreeAccess);
          
          return { token, user };
        } catch (error) {
          console.log('❌ Login failed:', error.response?.data?.error?.message || error.message);
          return null;
        }
      }
    },
    
    {
      name: '📊 Test 2: Verify JWT Expiry (365 days)',
      test: async (authData) => {
        if (!authData?.token) {
          console.log('⚠️ Skipped - No token from login');
          return;
        }
        
        try {
          // Decode token without verification to check expiry
          const base64Payload = authData.token.split('.')[1];
          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
          
          const now = Math.floor(Date.now() / 1000);
          const daysUntilExpiry = (payload.exp - now) / (24 * 60 * 60);
          
          console.log('✅ JWT Analysis:');
          console.log('   Expires on:', new Date(payload.exp * 1000).toLocaleDateString());
          console.log('   Days until expiry:', Math.round(daysUntilExpiry));
          
          if (daysUntilExpiry >= 350) {
            console.log('   🎉 EXCELLENT: ~365 day expiry confirmed!');
          } else if (daysUntilExpiry >= 80) {
            console.log('   ✅ GOOD: Long expiry period');
          } else {
            console.log('   ⚠️ WARNING: Expiry seems short');
          }
          
        } catch (error) {
          console.log('❌ Token analysis failed:', error.message);
        }
      }
    },

    {
      name: '🌐 Test 3: Profile API with Token',
      test: async (authData) => {
        if (!authData?.token) {
          console.log('⚠️ Skipped - No token');
          return;
        }
        
        try {
          const response = await axios.get(`${PRODUCTION_API}/auth/profile`, {
            headers: { Authorization: `Bearer ${authData.token}` }
          });
          
          const user = response.data.data.user;
          console.log('✅ Profile API successful');
          console.log('   User:', user.name);
          console.log('   XP:', user.xp);
          console.log('   Course Access:', user.hasFreeAccess);
          
        } catch (error) {
          const status = error.response?.status;
          const message = error.response?.data?.error?.message;
          console.log('❌ Profile API failed:', status, message);
          
          if (status === 401) {
            console.log('   🚨 CRITICAL: Token already invalid - logout would occur!');
          }
        }
      }
    },

    {
      name: '📱 Test 4: Simulate Network Error (Offline)',
      test: async (authData) => {
        if (!authData?.token) {
          console.log('⚠️ Skipped - No token');
          return;
        }
        
        try {
          // Use invalid URL to simulate network error
          await axios.get(`${PRODUCTION_API.replace('studdy-buddy', 'invalid-url')}/auth/profile`, {
            headers: { Authorization: `Bearer ${authData.token}` },
            timeout: 3000
          });
          
        } catch (error) {
          if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('✅ Network error simulated successfully');
            console.log('   Frontend should: KEEP USER LOGGED IN (not logout)');
            console.log('   Show message: "Working offline - you\'re still logged in"');
          } else {
            console.log('❌ Unexpected error:', error.message);
          }
        }
      }
    },

    {
      name: '🔄 Test 5: Token Refresh Endpoint',
      test: async (authData) => {
        if (!authData?.token) {
          console.log('⚠️ Skipped - No token');
          return;
        }
        
        try {
          const response = await axios.post(`${PRODUCTION_API}/auth/refresh-token`, {}, {
            headers: { Authorization: `Bearer ${authData.token}` }
          });
          
          const newToken = response.data.data?.token;
          if (newToken) {
            console.log('✅ Token refresh successful');
            console.log('   New token length:', newToken.length);
            console.log('   Frontend should: Save new token automatically');
          } else {
            console.log('⚠️ No new token returned');
          }
          
        } catch (error) {
          console.log('❌ Token refresh failed:', error.response?.data?.error?.message || error.message);
        }
      }
    }
  ];

  let authData = null;

  for (const scenario of testScenarios) {
    console.log(`\n${scenario.name}`);
    console.log('─'.repeat(60));
    
    if (scenario.name.includes('Test 1:')) {
      authData = await scenario.test();
    } else {
      await scenario.test(authData);
    }
  }
}

async function testFrontendScenarios() {
  console.log('\n🖥️  FRONTEND SCENARIOS TO TEST MANUALLY');
  console.log('═'.repeat(80));
  
  const manualTests = [
    {
      scenario: '📱 Mobile App Restart',
      steps: [
        '1. Login to mobile app',
        '2. Close app completely (force close)',
        '3. Reopen app after 5 minutes',
        '4. ✅ Should stay logged in (no login screen)'
      ]
    },
    {
      scenario: '🌐 Browser Refresh',
      steps: [
        '1. Login to web app',
        '2. Press F5 or Ctrl+R multiple times',
        '3. ✅ Should stay logged in (no login screen)'
      ]
    },
    {
      scenario: '📶 Network Interruption',
      steps: [
        '1. Login to app',
        '2. Turn off internet for 30 seconds',
        '3. Turn internet back on',
        '4. ✅ Should show "working offline" but stay logged in'
      ]
    },
    {
      scenario: '💤 Background Mode (Mobile)',
      steps: [
        '1. Login to mobile app',
        '2. Switch to other apps for 1 hour',
        '3. Return to Studdy Buddy app',
        '4. ✅ Should stay logged in (no login screen)'
      ]
    },
    {
      scenario: '🔄 Tab Switching (Web)',
      steps: [
        '1. Login to web app',
        '2. Open many tabs, switch between them',
        '3. Leave for 30 minutes, come back',
        '4. ✅ Should stay logged in (no login screen)'
      ]
    }
  ];

  manualTests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.scenario}`);
    console.log('─'.repeat(40));
    test.steps.forEach(step => console.log(`   ${step}`));
  });
}

async function runAllTests() {
  console.log('⏰ Starting production tests...\n');
  
  try {
    await testProductionAuth();
    await testFrontendScenarios();
    
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 TESTING SUMMARY');
    console.log('═'.repeat(80));
    console.log('✅ Run automatic backend tests above');
    console.log('📋 Complete manual frontend tests listed above');
    console.log('🎉 If all pass: Students will stay logged in for 365 days!');
    console.log('');
    console.log('🚨 CRITICAL CHECK:');
    console.log('   - JWT should expire in ~365 days');
    console.log('   - Network errors should NOT logout users');
    console.log('   - Only token expiry should trigger logout');
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

runAllTests();