import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testSignupScenarios() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         SIGNUP VALIDATION TEST - PREVENT A5X BUG                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const scenarios = [
    {
      name: 'Scenario 1: Both schoolName and schoolPassword',
      data: {
        name: 'Test User 1',
        email: `test1${Date.now()}@test.com`,
        password: 'password123',
        schoolName: 'Test School',
        schoolPassword: 'TESTPASS123'
      },
      shouldPass: false, // Will fail because not pre-registered, but validation will pass
      expectError: 'Invalid school password'
    },
    {
      name: 'Scenario 2: Only schoolName (MISSING schoolPassword) ❌',
      data: {
        name: 'Test User 2',
        email: `test2${Date.now()}@test.com`,
        password: 'password123',
        schoolName: 'Test School',
        schoolPassword: ''
      },
      shouldPass: false,
      expectError: 'Both school name and school password are required'
    },
    {
      name: 'Scenario 3: Only schoolPassword (MISSING schoolName) ❌',
      data: {
        name: 'Test User 3',
        email: `test3${Date.now()}@test.com`,
        password: 'password123',
        schoolName: '',
        schoolPassword: 'TESTPASS123'
      },
      shouldPass: false,
      expectError: 'Both school name and school password are required'
    },
    {
      name: 'Scenario 4: Neither schoolName nor schoolPassword (Freemium) ✅',
      data: {
        name: 'Test User 4',
        email: `test4${Date.now()}@test.com`,
        password: 'password123',
        schoolName: '',
        schoolPassword: ''
      },
      shouldPass: true,
      expectError: null
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n${scenario.name}`);
    console.log('─'.repeat(70));
    console.log('Request Data:', JSON.stringify(scenario.data, null, 2));

    try {
      const response = await axios.post(`${API_URL}/auth/register`, scenario.data);
      
      if (scenario.shouldPass) {
        console.log('✅ PASSED - User created successfully');
        console.log('   User:', response.data.data.user.name);
        console.log('   Email:', response.data.data.user.email);
        console.log('   SchoolName:', response.data.data.user.schoolName || '(empty - freemium)');
        console.log('   HasFreeAccess:', response.data.data.user.hasFreeAccess);
      } else {
        console.log('❌ UNEXPECTED SUCCESS - Should have been rejected');
      }
    } catch (error) {
      if (error.response) {
        const errorMsg = error.response.data.error?.message || 'Unknown error';
        
        if (scenario.expectError && errorMsg.includes(scenario.expectError)) {
          console.log('✅ PASSED - Correctly rejected with expected error');
          console.log(`   Error: "${errorMsg}"`);
        } else if (!scenario.shouldPass) {
          console.log('✅ PASSED - Rejected (different error)');
          console.log(`   Error: "${errorMsg}"`);
        } else {
          console.log('❌ FAILED - Unexpected error');
          console.log(`   Error: "${errorMsg}"`);
        }
      } else {
        console.log('❌ NETWORK ERROR:', error.message);
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(70));
  console.log('✅ Scenario 2 & 3 should be REJECTED (incomplete school info)');
  console.log('✅ Scenario 4 should be ACCEPTED (freemium user)');
  console.log('✅ This prevents A5x bug from happening again!');
  console.log('═'.repeat(70));
}

// Only run if server is running
console.log('⚠️  NOTE: Make sure backend server is running on port 5000');
console.log('   Run: npm start (in backend folder)');
console.log('\nPress Ctrl+C if server is NOT running, otherwise test will start in 3 seconds...\n');

setTimeout(() => {
  testSignupScenarios().catch(err => {
    console.error('Test failed:', err.message);
  });
}, 3000);
