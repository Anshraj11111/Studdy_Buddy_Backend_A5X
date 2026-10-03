import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const ADMIN_SECRET = 'H5';

async function testCourseAccessEndpoints() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         COURSE ACCESS ADMIN ENDPOINTS TEST                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const endpoints = [
    '/admin/course-access/stats',
    '/admin/course-access/schools',
    '/admin/course-access/list?filter=all&page=1&limit=20'
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    console.log('─'.repeat(70));

    try {
      const response = await axios.get(API_URL + endpoint, {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      });

      console.log('✅ SUCCESS:', response.status);
      console.log('Data keys:', Object.keys(response.data));
      
      if (response.data.data) {
        console.log('Data content:', JSON.stringify(response.data.data, null, 2).substring(0, 200) + '...');
      }
    } catch (error) {
      console.log('❌ FAILED:', error.response?.status, error.response?.data?.error?.message || error.message);
    }
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('If all tests pass: Course Access Management will work in admin panel');
  console.log('═'.repeat(70));
}

testCourseAccessEndpoints().catch(err => {
  console.error('Test failed:', err.message);
});
