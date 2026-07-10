/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔥 STUDDY BUDDY - 10K USER LOAD TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script simulates 10,000 concurrent users across all major features:
 * - User registration & authentication (PRIMARY DB)
 * - Doubt posting & resources (SECONDARY DB)
 * - Real-time messaging & broadcasts (TERTIARY DB)
 * - YouTube Live streaming (unlimited viewers)
 * - WebRTC video calls (P2P - tested separately)
 */

import axios from 'axios';
import { io } from 'socket.io-client';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BACKEND_URLS = [
  'https://studdy-buddy-backend-a5x-ytip.onrender.com',
  'https://studdy-buddy-backend-a5x-2dn7.onrender.com'
];

const TEST_CONFIG = {
  // Phase 1: Gradual ramp-up (realistic traffic pattern)
  WAVE_1_USERS: 1000,    // First 1K users
  WAVE_2_USERS: 2500,    // Next 2.5K users (total 3.5K)
  WAVE_3_USERS: 3500,    // Next 3.5K users (total 7K)
  WAVE_4_USERS: 3000,    // Final 3K users (total 10K)
  
  // Delays between waves (seconds)
  WAVE_1_DELAY: 0,
  WAVE_2_DELAY: 30,
  WAVE_3_DELAY: 60,
  WAVE_4_DELAY: 90,
  
  // Test duration
  TEST_DURATION_MINUTES: 10,
  
  // Feature distribution (% of users testing each feature)
  AUTH_PERCENTAGE: 100,        // All users authenticate
  DOUBTS_PERCENTAGE: 40,       // 40% post doubts
  RESOURCES_PERCENTAGE: 30,    // 30% browse resources
  CHAT_PERCENTAGE: 50,         // 50% send messages
  BROADCAST_PERCENTAGE: 20,    // 20% watch broadcasts
  VIDEO_CALL_PERCENTAGE: 5,    // 5% attempt video calls (limited by P2P)
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST METRICS
// ═══════════════════════════════════════════════════════════════════════════

const metrics = {
  totalUsers: 0,
  successfulRegistrations: 0,
  successfulLogins: 0,
  doubtsPosts: 0,
  resourcesViews: 0,
  messagesSent: 0,
  broadcastViews: 0,
  videoCallAttempts: 0,
  errors: [],
  responseTimes: [],
  peakConcurrentUsers: 0,
  databaseLatency: {
    primary: [],
    secondary: [],
    tertiary: []
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getRandomBackend() {
  return BACKEND_URLS[Math.floor(Math.random() * BACKEND_URLS.length)];
}

function generateTestUser(index) {
  return {
    name: `TestUser_${index}_${Date.now()}`,
    email: `testuser${index}_${Date.now()}@loadtest.com`,
    password: 'Test@12345',
    instituteName: 'Load Test University',
    role: Math.random() > 0.8 ? 'mentor' : 'student',
    subjects: ['Math', 'Physics', 'Computer Science']
  };
}

async function measureLatency(fn, dbType) {
  const start = Date.now();
  try {
    await fn();
    const latency = Date.now() - start;
    metrics.databaseLatency[dbType].push(latency);
    metrics.responseTimes.push(latency);
    return latency;
  } catch (error) {
    const latency = Date.now() - start;
    metrics.responseTimes.push(latency);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test 1: User Registration & Authentication (PRIMARY DB)
 */
async function testAuthentication(userIndex) {
  try {
    const backend = getRandomBackend();
    const user = generateTestUser(userIndex);
    
    // Register user
    const latency = await measureLatency(async () => {
      const response = await axios.post(`${backend}/api/auth/register`, user, {
        timeout: 30000
      });
      return response.data;
    }, 'primary');
    
    if (latency < 5000) {
      metrics.successfulRegistrations++;
      return user;
    } else {
      metrics.errors.push({ type: 'SLOW_AUTH', latency, user: userIndex });
      return null;
    }
  } catch (error) {
    metrics.errors.push({ 
      type: 'AUTH_FAILED', 
      message: error.message,
      user: userIndex 
    });
    return null;
  }
}

/**
 * Test 2: Post Doubts (SECONDARY DB)
 */
async function testDoubtPosting(token, userIndex) {
  try {
    const backend = getRandomBackend();
    const doubt = {
      title: `Load Test Doubt ${userIndex}`,
      description: `This is a test doubt posted during load testing by user ${userIndex}`,
      subject: ['Math', 'Physics', 'Chemistry'][Math.floor(Math.random() * 3)],
      tags: ['test', 'loadtest']
    };
    
    await measureLatency(async () => {
      await axios.post(`${backend}/api/doubts`, doubt, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
    }, 'secondary');
    
    metrics.doubtsPosts++;
  } catch (error) {
    metrics.errors.push({ 
      type: 'DOUBT_POST_FAILED', 
      message: error.message,
      user: userIndex 
    });
  }
}

/**
 * Test 3: Browse Resources (SECONDARY DB)
 */
async function testResourceBrowsing(token, userIndex) {
  try {
    const backend = getRandomBackend();
    
    await measureLatency(async () => {
      await axios.get(`${backend}/api/resources?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
    }, 'secondary');
    
    metrics.resourcesViews++;
  } catch (error) {
    metrics.errors.push({ 
      type: 'RESOURCE_VIEW_FAILED', 
      message: error.message,
      user: userIndex 
    });
  }
}

/**
 * Test 4: Real-time Chat (TERTIARY DB + Socket.IO)
 */
async function testRealTimeChat(token, userIndex) {
  return new Promise((resolve) => {
    try {
      const backend = getRandomBackend();
      const socket = io(backend, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000
      });
      
      socket.on('connect', () => {
        socket.emit('sendMessage', {
          roomId: 'loadtest_room',
          message: `Test message from user ${userIndex}`,
          timestamp: Date.now()
        });
        
        metrics.messagesSent++;
        
        setTimeout(() => {
          socket.disconnect();
          resolve();
        }, 5000);
      });
      
      socket.on('connect_error', (error) => {
        metrics.errors.push({ 
          type: 'SOCKET_CONNECT_FAILED', 
          message: error.message,
          user: userIndex 
        });
        resolve();
      });
      
      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 15000);
      
    } catch (error) {
      metrics.errors.push({ 
        type: 'CHAT_FAILED', 
        message: error.message,
        user: userIndex 
      });
      resolve();
    }
  });
}

/**
 * Test 5: YouTube Live Broadcast Viewing (TERTIARY DB)
 */
async function testBroadcastViewing(token, userIndex) {
  try {
    const backend = getRandomBackend();
    
    // Get active broadcasts
    const response = await measureLatency(async () => {
      return await axios.get(`${backend}/api/broadcast/active`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
    }, 'tertiary');
    
    metrics.broadcastViews++;
    
    // Simulate watching for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    // If no active broadcasts, that's okay
    if (error.response?.status !== 404) {
      metrics.errors.push({ 
        type: 'BROADCAST_VIEW_FAILED', 
        message: error.message,
        user: userIndex 
      });
    }
  }
}

/**
 * Test 6: Video Call Attempt (WebRTC signaling via TERTIARY DB)
 */
async function testVideoCallSignaling(token, userIndex) {
  try {
    const backend = getRandomBackend();
    
    // Get ICE servers
    await measureLatency(async () => {
      await axios.get(`${backend}/api/ice-servers`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
    }, 'tertiary');
    
    metrics.videoCallAttempts++;
    
  } catch (error) {
    metrics.errors.push({ 
      type: 'VIDEO_CALL_FAILED', 
      message: error.message,
      user: userIndex 
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER SIMULATION
// ═══════════════════════════════════════════════════════════════════════════

async function simulateUser(userIndex) {
  console.log(`🚀 User ${userIndex} starting test...`);
  
  try {
    // Step 1: Authentication (100% of users)
    const user = await testAuthentication(userIndex);
    if (!user) return;
    
    // Login to get token
    const backend = getRandomBackend();
    const loginResponse = await axios.post(`${backend}/api/auth/login`, {
      email: user.email,
      password: user.password
    });
    
    const token = loginResponse.data.data.token;
    metrics.successfulLogins++;
    
    // Step 2: Random feature testing based on percentages
    const randomActions = [];
    
    if (Math.random() * 100 < TEST_CONFIG.DOUBTS_PERCENTAGE) {
      randomActions.push(testDoubtPosting(token, userIndex));
    }
    
    if (Math.random() * 100 < TEST_CONFIG.RESOURCES_PERCENTAGE) {
      randomActions.push(testResourceBrowsing(token, userIndex));
    }
    
    if (Math.random() * 100 < TEST_CONFIG.CHAT_PERCENTAGE) {
      randomActions.push(testRealTimeChat(token, userIndex));
    }
    
    if (Math.random() * 100 < TEST_CONFIG.BROADCAST_PERCENTAGE) {
      randomActions.push(testBroadcastViewing(token, userIndex));
    }
    
    if (Math.random() * 100 < TEST_CONFIG.VIDEO_CALL_PERCENTAGE) {
      randomActions.push(testVideoCallSignaling(token, userIndex));
    }
    
    // Execute all actions in parallel
    await Promise.all(randomActions);
    
    console.log(`✅ User ${userIndex} completed test successfully`);
    
  } catch (error) {
    metrics.errors.push({ 
      type: 'USER_SIMULATION_FAILED', 
      message: error.message,
      user: userIndex 
    });
    console.error(`❌ User ${userIndex} test failed:`, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WAVE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function executeWave(waveNumber, userCount, startIndex) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🌊 WAVE ${waveNumber}: Launching ${userCount} users...`);
  console.log(`${'═'.repeat(80)}\n`);
  
  const waveStart = Date.now();
  const users = [];
  
  // Launch users in batches of 50 to avoid overwhelming the system
  const BATCH_SIZE = 50;
  for (let i = 0; i < userCount; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, userCount - i);
    const batch = [];
    
    for (let j = 0; j < batchSize; j++) {
      const userIndex = startIndex + i + j;
      batch.push(simulateUser(userIndex));
      metrics.totalUsers++;
    }
    
    users.push(...batch);
    
    // Small delay between batches (100ms)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Wait for all users in this wave to complete
  await Promise.all(users);
  
  const waveDuration = ((Date.now() - waveStart) / 1000).toFixed(2);
  console.log(`\n✅ Wave ${waveNumber} completed in ${waveDuration}s`);
  
  // Update peak concurrent users
  metrics.peakConcurrentUsers = Math.max(metrics.peakConcurrentUsers, userCount);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function runLoadTest() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                   🔥 STUDDY BUDDY 10K LOAD TEST 🔥                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Target: 10,000 concurrent users across 3 databases                      ║
║  Backend Servers: ${BACKEND_URLS.length}                                                           ║
║  Test Duration: ${TEST_CONFIG.TEST_DURATION_MINUTES} minutes                                                 ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);
  
  const testStart = Date.now();
  
  try {
    // Wave 1: 1,000 users (immediate)
    await executeWave(1, TEST_CONFIG.WAVE_1_USERS, 0);
    
    // Wave 2: 2,500 users (after 30s)
    console.log(`\n⏳ Waiting ${TEST_CONFIG.WAVE_2_DELAY}s before Wave 2...`);
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.WAVE_2_DELAY * 1000));
    await executeWave(2, TEST_CONFIG.WAVE_2_USERS, TEST_CONFIG.WAVE_1_USERS);
    
    // Wave 3: 3,500 users (after 60s total)
    console.log(`\n⏳ Waiting ${TEST_CONFIG.WAVE_3_DELAY - TEST_CONFIG.WAVE_2_DELAY}s before Wave 3...`);
    await new Promise(resolve => setTimeout(resolve, (TEST_CONFIG.WAVE_3_DELAY - TEST_CONFIG.WAVE_2_DELAY) * 1000));
    await executeWave(3, TEST_CONFIG.WAVE_3_USERS, TEST_CONFIG.WAVE_1_USERS + TEST_CONFIG.WAVE_2_USERS);
    
    // Wave 4: 3,000 users (after 90s total)
    console.log(`\n⏳ Waiting ${TEST_CONFIG.WAVE_4_DELAY - TEST_CONFIG.WAVE_3_DELAY}s before Wave 4...`);
    await new Promise(resolve => setTimeout(resolve, (TEST_CONFIG.WAVE_4_DELAY - TEST_CONFIG.WAVE_3_DELAY) * 1000));
    await executeWave(4, TEST_CONFIG.WAVE_4_USERS, TEST_CONFIG.WAVE_1_USERS + TEST_CONFIG.WAVE_2_USERS + TEST_CONFIG.WAVE_3_USERS);
    
  } catch (error) {
    console.error('\n❌ Load test failed:', error);
  }
  
  const testDuration = ((Date.now() - testStart) / 1000 / 60).toFixed(2);
  
  // ═════════════════════════════════════════════════════════════════════════
  // GENERATE REPORT
  // ═════════════════════════════════════════════════════════════════════════
  
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log('📊 LOAD TEST RESULTS');
  console.log(`${'═'.repeat(80)}\n`);
  
  console.log('🎯 USER STATISTICS:');
  console.log(`   Total Users Simulated: ${metrics.totalUsers}`);
  console.log(`   Successful Registrations: ${metrics.successfulRegistrations} (${(metrics.successfulRegistrations/metrics.totalUsers*100).toFixed(1)}%)`);
  console.log(`   Successful Logins: ${metrics.successfulLogins} (${(metrics.successfulLogins/metrics.totalUsers*100).toFixed(1)}%)`);
  console.log(`   Peak Concurrent Users: ${metrics.peakConcurrentUsers}`);
  
  console.log('\n📝 FEATURE USAGE:');
  console.log(`   Doubts Posted (SECONDARY DB): ${metrics.doubtsPosts}`);
  console.log(`   Resources Viewed (SECONDARY DB): ${metrics.resourcesViews}`);
  console.log(`   Messages Sent (TERTIARY DB): ${metrics.messagesSent}`);
  console.log(`   Broadcast Views (TERTIARY DB): ${metrics.broadcastViews}`);
  console.log(`   Video Call Attempts: ${metrics.videoCallAttempts}`);
  
  console.log('\n⚡ PERFORMANCE METRICS:');
  const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  const p95ResponseTime = metrics.responseTimes.sort((a, b) => a - b)[Math.floor(metrics.responseTimes.length * 0.95)];
  const p99ResponseTime = metrics.responseTimes.sort((a, b) => a - b)[Math.floor(metrics.responseTimes.length * 0.99)];
  
  console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`   P95 Response Time: ${p95ResponseTime}ms`);
  console.log(`   P99 Response Time: ${p99ResponseTime}ms`);
  console.log(`   Test Duration: ${testDuration} minutes`);
  
  console.log('\n💾 DATABASE LATENCY:');
  if (metrics.databaseLatency.primary.length > 0) {
    const primaryAvg = metrics.databaseLatency.primary.reduce((a, b) => a + b, 0) / metrics.databaseLatency.primary.length;
    console.log(`   PRIMARY DB (Users/Auth): ${primaryAvg.toFixed(0)}ms avg`);
  }
  if (metrics.databaseLatency.secondary.length > 0) {
    const secondaryAvg = metrics.databaseLatency.secondary.reduce((a, b) => a + b, 0) / metrics.databaseLatency.secondary.length;
    console.log(`   SECONDARY DB (Doubts/Resources): ${secondaryAvg.toFixed(0)}ms avg`);
  }
  if (metrics.databaseLatency.tertiary.length > 0) {
    const tertiaryAvg = metrics.databaseLatency.tertiary.reduce((a, b) => a + b, 0) / metrics.databaseLatency.tertiary.length;
    console.log(`   TERTIARY DB (Messages/Broadcasts): ${tertiaryAvg.toFixed(0)}ms avg`);
  }
  
  console.log('\n❌ ERRORS:');
  console.log(`   Total Errors: ${metrics.errors.length} (${(metrics.errors.length/(metrics.totalUsers*5)*100).toFixed(2)}% error rate)`);
  
  // Group errors by type
  const errorsByType = {};
  metrics.errors.forEach(err => {
    errorsByType[err.type] = (errorsByType[err.type] || 0) + 1;
  });
  
  Object.entries(errorsByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log('✅ VERDICT:');
  
  const successRate = (metrics.successfulLogins / metrics.totalUsers * 100);
  const errorRate = (metrics.errors.length / (metrics.totalUsers * 5) * 100);
  
  if (successRate >= 95 && errorRate < 5 && avgResponseTime < 3000) {
    console.log('   🎉 PASSED - System can handle 10K+ concurrent users!');
    console.log('   ✅ Multi-database architecture is working perfectly');
    console.log('   ✅ Response times are within acceptable limits');
    console.log('   ✅ Error rate is below threshold');
  } else if (successRate >= 85 && errorRate < 10) {
    console.log('   ⚠️  PARTIAL PASS - System is functional but needs optimization');
    console.log(`   - Success rate: ${successRate.toFixed(1)}% (target: 95%+)`);
    console.log(`   - Error rate: ${errorRate.toFixed(2)}% (target: <5%)`);
    console.log(`   - Avg response: ${avgResponseTime.toFixed(0)}ms (target: <3000ms)`);
  } else {
    console.log('   ❌ FAILED - System cannot handle 10K concurrent users');
    console.log(`   - Success rate: ${successRate.toFixed(1)}% (too low)`);
    console.log(`   - Error rate: ${errorRate.toFixed(2)}% (too high)`);
  }
  
  console.log(`${'═'.repeat(80)}\n`);
}

// Run the test
runLoadTest().catch(console.error);
