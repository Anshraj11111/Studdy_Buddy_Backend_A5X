import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

console.log('\n🔐 LOCAL ANTI-LOGOUT SYSTEM TEST');
console.log('═'.repeat(70));

async function testLocalAuth() {
  try {
    console.log('🔍 Test 1: Login with Pragyan Soni');
    console.log('─'.repeat(50));
    
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'pragyan.soni@student.com',
      password: 'password123',
      role: 'student',
      schoolPassword: 'E028RBPE'
    });
    
    const { token, user } = loginResponse.data.data;
    console.log('✅ Login successful');
    console.log('   User:', user.name);
    console.log('   Has Free Access:', user.hasFreeAccess);
    console.log('   Token (first 30 chars):', token.substring(0, 30) + '...');
    
    // Test 2: JWT Expiry Analysis
    console.log('\n📊 Test 2: JWT Token Analysis');
    console.log('─'.repeat(50));
    
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    
    const now = Math.floor(Date.now() / 1000);
    const issuedAt = new Date(payload.iat * 1000);
    const expiresAt = new Date(payload.exp * 1000);
    const daysUntilExpiry = (payload.exp - now) / (24 * 60 * 60);
    
    console.log('✅ JWT Details:');
    console.log('   Issued at:', issuedAt.toLocaleString());
    console.log('   Expires at:', expiresAt.toLocaleDateString());
    console.log('   Days until expiry:', Math.round(daysUntilExpiry));
    
    if (daysUntilExpiry >= 360) {
      console.log('   🎉 PERFECT: 365-day expiry confirmed!');
    } else if (daysUntilExpiry >= 85) {
      console.log('   ✅ GOOD: Long expiry period');
    } else {
      console.log('   ⚠️ WARNING: Short expiry - students will logout soon!');
    }
    
    // Test 3: Profile API
    console.log('\n🌐 Test 3: Profile API with Valid Token');
    console.log('─'.repeat(50));
    
    const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const profileUser = profileResponse.data.data.user;
    console.log('✅ Profile API successful');
    console.log('   User:', profileUser.name);
    console.log('   XP:', profileUser.xp);
    console.log('   School:', profileUser.schoolName);
    
    // Test 4: Invalid Token Simulation
    console.log('\n🔒 Test 4: Invalid Token (Should Logout)');
    console.log('─'.repeat(50));
    
    try {
      await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer invalid_token_12345` }
      });
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message;
      
      if (status === 401) {
        console.log('✅ Invalid token correctly rejected');
        console.log('   Status:', status);
        console.log('   Message:', message);
        console.log('   Frontend should: LOGOUT user (expected behavior)');
      }
    }
    
    // Test 5: Network Error Simulation
    console.log('\n📶 Test 5: Network Error (Should NOT Logout)');
    console.log('─'.repeat(50));
    
    try {
      await axios.get('http://invalid-domain-12345.com/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 2000
      });
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNABORTED') {
        console.log('✅ Network error simulated');
        console.log('   Error:', error.code);
        console.log('   Frontend should: KEEP user logged in + show "working offline"');
      }
    }
    
    // Test 6: Token Refresh
    console.log('\n🔄 Test 6: Token Refresh');
    console.log('─'.repeat(50));
    
    try {
      const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newToken = refreshResponse.data.data?.token;
      if (newToken) {
        console.log('✅ Token refresh successful');
        console.log('   New token length:', newToken.length);
        
        // Compare expiry times
        const newPayload = JSON.parse(Buffer.from(newToken.split('.')[1], 'base64').toString());
        const newExpiry = new Date(newPayload.exp * 1000);
        
        console.log('   New expiry:', newExpiry.toLocaleDateString());
        console.log('   Frontend should: Auto-save new token');
      }
    } catch (error) {
      console.log('⚠️ Token refresh not available or failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    }
  }
}

async function runTests() {
  console.log('⚠️ PREREQUISITE: Make sure local backend server is running on port 5000');
  console.log('   Command: npm start (in backend folder)\n');
  
  try {
    await testLocalAuth();
    
    console.log('\n' + '═'.repeat(70));
    console.log('🎯 LOCAL TEST RESULTS SUMMARY');
    console.log('═'.repeat(70));
    console.log('✅ Check above tests passed');
    console.log('📋 If all pass locally, production should work the same');
    console.log('🎉 Students should stay logged in for 365 days!');
    console.log('═'.repeat(70));
    
  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  }
}

runTests();