/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚡ QUICK API ENDPOINT TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Fast test of all major API endpoints to ensure they're working
 */

import axios from 'axios';

const BACKEND_URLS = [
  'https://studdy-buddy-backend-a5x-ytip.onrender.com',
  'https://studdy-buddy-backend-a5x-2dn7.onrender.com'
];

async function testEndpoint(name, url, method = 'GET', data = null, headers = {}) {
  const start = Date.now();
  try {
    const config = {
      method,
      url,
      timeout: 15000,
      headers
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    const latency = Date.now() - start;
    
    console.log(`   ✅ ${name}: ${response.status} (${latency}ms)`);
    return { success: true, latency, status: response.status };
  } catch (error) {
    const latency = Date.now() - start;
    console.log(`   ❌ ${name}: ${error.response?.status || 'ERROR'} (${latency}ms) - ${error.message}`);
    return { success: false, latency, error: error.message };
  }
}

async function testBackendServer(backendUrl, serverIndex) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🖥️  Testing Backend Server ${serverIndex + 1}: ${backendUrl}`);
  console.log(`${'═'.repeat(80)}\n`);

  const results = [];

  // Health checks
  console.log('🏥 Health Checks:');
  results.push(await testEndpoint('Server Health', `${backendUrl}/health`));
  results.push(await testEndpoint('Database Health', `${backendUrl}/health/db`));
  results.push(await testEndpoint('Ping', `${backendUrl}/ping`));
  
  // ICE servers (for video calls)
  console.log('\n📞 WebRTC Configuration:');
  results.push(await testEndpoint('ICE Servers', `${backendUrl}/api/ice-servers`));

  // Authentication endpoints
  console.log('\n🔐 Authentication Endpoints:');
  const testUser = {
    name: `QuickTest_${Date.now()}`,
    email: `quicktest_${Date.now()}@test.com`,
    password: 'Test@12345',
    instituteName: 'Test University',
    role: 'student',
    subjects: ['Math']
  };

  const registerResult = await testEndpoint(
    'Register',
    `${backendUrl}/api/auth/register`,
    'POST',
    testUser
  );
  results.push(registerResult);

  let authToken = null;
  if (registerResult.success) {
    const loginResult = await testEndpoint(
      'Login',
      `${backendUrl}/api/auth/login`,
      'POST',
      { email: testUser.email, password: testUser.password }
    );
    results.push(loginResult);
    
    // Extract token if login successful
    try {
      const loginResponse = await axios.post(`${backendUrl}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      authToken = loginResponse.data.data.token;
    } catch (e) {}
  }

  if (authToken) {
    const headers = { Authorization: `Bearer ${authToken}` };

    // Content endpoints (SECONDARY DB)
    console.log('\n📚 Content Endpoints (SECONDARY DB):');
    results.push(await testEndpoint('Get Doubts', `${backendUrl}/api/doubts?limit=5`, 'GET', null, headers));
    results.push(await testEndpoint('Get Resources', `${backendUrl}/api/resources?limit=5`, 'GET', null, headers));
    
    // Social endpoints (PRIMARY DB)
    console.log('\n👥 Social Endpoints (PRIMARY DB):');
    results.push(await testEndpoint('Get Communities', `${backendUrl}/api/communities?limit=5`, 'GET', null, headers));
    results.push(await testEndpoint('Get Mentors', `${backendUrl}/api/mentor/all?limit=5`, 'GET', null, headers));
    
    // Real-time endpoints (TERTIARY DB)
    console.log('\n💬 Real-time Endpoints (TERTIARY DB):');
    results.push(await testEndpoint('Get Notifications', `${backendUrl}/api/notifications`, 'GET', null, headers));
    results.push(await testEndpoint('Get Active Broadcasts', `${backendUrl}/api/broadcast/active`, 'GET', null, headers));
  }

  // Calculate statistics
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / totalCount;

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📊 Server ${serverIndex + 1} Results:`);
  console.log(`   Success Rate: ${successCount}/${totalCount} (${(successCount/totalCount*100).toFixed(1)}%)`);
  console.log(`   Average Latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`${'─'.repeat(80)}`);

  return {
    serverUrl: backendUrl,
    successCount,
    totalCount,
    avgLatency,
    successRate: (successCount/totalCount*100).toFixed(1)
  };
}

async function runQuickTest() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    ⚡ QUICK API ENDPOINT TEST ⚡                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Testing all major API endpoints across both backend servers             ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  const serverResults = [];

  for (let i = 0; i < BACKEND_URLS.length; i++) {
    const result = await testBackendServer(BACKEND_URLS[i], i);
    serverResults.push(result);
    
    if (i < BACKEND_URLS.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before testing next server...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log('📊 FINAL SUMMARY');
  console.log(`${'═'.repeat(80)}\n`);

  serverResults.forEach((result, index) => {
    console.log(`Server ${index + 1}: ${result.serverUrl}`);
    console.log(`   ✅ Success Rate: ${result.successRate}%`);
    console.log(`   ⚡ Avg Latency: ${result.avgLatency.toFixed(0)}ms`);
    console.log(`   📊 Tests: ${result.successCount}/${result.totalCount} passed\n`);
  });

  const totalSuccess = serverResults.reduce((sum, r) => sum + r.successCount, 0);
  const totalTests = serverResults.reduce((sum, r) => sum + r.totalCount, 0);
  const overallSuccessRate = (totalSuccess / totalTests * 100).toFixed(1);

  console.log(`${'─'.repeat(80)}`);
  console.log(`Overall Success Rate: ${overallSuccessRate}%`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Total Passed: ${totalSuccess}`);
  console.log(`Total Failed: ${totalTests - totalSuccess}`);
  console.log(`${'─'.repeat(80)}\n`);

  if (overallSuccessRate >= 90) {
    console.log('✅ VERDICT: All systems operational! Ready for production.\n');
  } else if (overallSuccessRate >= 70) {
    console.log('⚠️  VERDICT: Most systems working, but some endpoints need attention.\n');
  } else {
    console.log('❌ VERDICT: Critical issues detected. System needs maintenance.\n');
  }

  console.log(`${'═'.repeat(80)}\n`);
}

runQuickTest().catch(console.error);
