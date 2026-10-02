import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testAdminEndpoints() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         ADMIN ENDPOINT TEST - localhost:5000                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const tests = [
    {
      name: 'Test 1: School channels WITHOUT admin secret',
      url: '/school-channel/admin/all',
      headers: {},
      shouldFail: true
    },
    {
      name: 'Test 2: School channels WITH admin secret',
      url: '/school-channel/admin/all',
      headers: { 'x-admin-secret': 'H5' },
      shouldFail: false
    },
    {
      name: 'Test 3: Admin stats WITHOUT admin secret',
      url: '/admin/stats',
      headers: {},
      shouldFail: true
    },
    {
      name: 'Test 4: Admin stats WITH admin secret',
      url: '/admin/stats',
      headers: { 'x-admin-secret': 'H5' },
      shouldFail: false
    }
  ];

  for (const test of tests) {
    console.log(test.name);
    console.log('─'.repeat(70));
    console.log('URL:', API_URL + test.url);
    console.log('Headers:', JSON.stringify(test.headers, null, 2));

    try {
      const response = await axios.get(API_URL + test.url, { headers: test.headers });
      
      if (test.shouldFail) {
        console.log('❌ UNEXPECTED: Request succeeded (should have failed)');
      } else {
        console.log('✅ SUCCESS:', response.status);
        console.log('Data keys:', Object.keys(response.data));
        if (test.url.includes('school-channel')) {
          console.log('Channels count:', response.data.channels?.length || 0);
        }
      }
    } catch (error) {
      if (test.shouldFail) {
        console.log('✅ EXPECTED FAIL:', error.response?.status, error.response?.data?.error?.message);
      } else {
        console.log('❌ FAILED:', error.response?.status, error.response?.data?.error?.message || error.message);
        console.log('Full error:', error.response?.data);
      }
    }
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('SUMMARY:');
  console.log('═'.repeat(70));
  console.log('If Test 2 passes: Backend is working correctly');
  console.log('If Test 2 fails: Check if x-admin-secret header is being sent from frontend');
  console.log('');
  console.log('FRONTEND FIX:');
  console.log('Open browser console and run:');
  console.log('  sessionStorage.setItem("admin_secret", "H5")');
  console.log('  sessionStorage.setItem("admin_auth", "true")');
  console.log('  location.reload()');
  console.log('═'.repeat(70));
}

testAdminEndpoints().catch(err => {
  console.error('Test suite failed:', err.message);
});
