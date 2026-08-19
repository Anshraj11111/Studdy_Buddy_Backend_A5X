import { createClient } from 'redis';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

const log = (emoji, message, color = RESET) => {
  console.log(`${color}${emoji} ${message}${RESET}`);
};

const testRedisOperations = async () => {
  console.log('\n' + '='.repeat(60));
  log('🧪', 'REDIS COMPREHENSIVE TEST SUITE', BLUE);
  console.log('='.repeat(60) + '\n');
  
  const redisUrl = process.env.REDIS_URL;
  log('📍', `Redis URL: ${redisUrl?.substring(0, 50)}...`);
  
  let client;
  
  try {
    // ═══════════════════════════════════════════════════════════
    // TEST 1: Connection
    // ═══════════════════════════════════════════════════════════
    log('🔌', 'TEST 1: Redis Connection', BLUE);
    client = createClient({ url: redisUrl });
    
    await client.connect();
    log('✅', 'Connection established successfully', GREEN);
    testsPassed++;
    
    // ═══════════════════════════════════════════════════════════
    // TEST 2: Basic SET/GET Operations
    // ═══════════════════════════════════════════════════════════
    log('\n🔧', 'TEST 2: Basic SET/GET Operations', BLUE);
    
    await client.set('test:basic', 'Hello Redis!');
    const basicValue = await client.get('test:basic');
    
    if (basicValue === 'Hello Redis!') {
      log('✅', 'SET/GET working correctly', GREEN);
      testsPassed++;
    } else {
      log('❌', 'SET/GET failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 3: SET with TTL (Expiry)
    // ═══════════════════════════════════════════════════════════
    log('\n⏱️', 'TEST 3: SET with TTL (Time To Live)', BLUE);
    
    await client.setEx('test:ttl', 5, 'Expires in 5 seconds');
    const ttlValue = await client.get('test:ttl');
    const ttl = await client.ttl('test:ttl');
    
    if (ttlValue === 'Expires in 5 seconds' && ttl > 0 && ttl <= 5) {
      log('✅', `TTL working correctly (expires in ${ttl}s)`, GREEN);
      testsPassed++;
    } else {
      log('❌', 'TTL test failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 4: JSON Storage (for caching objects)
    // ═══════════════════════════════════════════════════════════
    log('\n📦', 'TEST 4: JSON Object Storage', BLUE);
    
    const testObject = {
      userId: '123',
      name: 'Test User',
      doubts: ['Math', 'Physics'],
      timestamp: Date.now()
    };
    
    await client.set('test:json', JSON.stringify(testObject));
    const jsonValue = await client.get('test:json');
    const parsedObject = JSON.parse(jsonValue);
    
    if (parsedObject.userId === '123' && parsedObject.doubts.length === 2) {
      log('✅', 'JSON storage/retrieval working correctly', GREEN);
      testsPassed++;
    } else {
      log('❌', 'JSON storage failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 5: Delete Operation
    // ═══════════════════════════════════════════════════════════
    log('\n🗑️', 'TEST 5: Delete Operation', BLUE);
    
    await client.set('test:delete', 'To be deleted');
    await client.del('test:delete');
    const deletedValue = await client.get('test:delete');
    
    if (deletedValue === null) {
      log('✅', 'Delete operation working correctly', GREEN);
      testsPassed++;
    } else {
      log('❌', 'Delete operation failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 6: Multiple Keys (Batch Operations)
    // ═══════════════════════════════════════════════════════════
    log('\n📚', 'TEST 6: Multiple Keys Operation', BLUE);
    
    await client.mSet({
      'test:key1': 'value1',
      'test:key2': 'value2',
      'test:key3': 'value3'
    });
    
    const values = await client.mGet(['test:key1', 'test:key2', 'test:key3']);
    
    if (values.length === 3 && values[0] === 'value1' && values[2] === 'value3') {
      log('✅', 'Batch operations working correctly', GREEN);
      testsPassed++;
    } else {
      log('❌', 'Batch operations failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 7: Pattern-based Key Deletion
    // ═══════════════════════════════════════════════════════════
    log('\n🔍', 'TEST 7: Pattern-based Key Search & Delete', BLUE);
    
    await client.set('doubts:list:page1', 'data1');
    await client.set('doubts:list:page2', 'data2');
    await client.set('doubts:list:page3', 'data3');
    
    const keys = await client.keys('doubts:list:*');
    
    if (keys.length >= 3) {
      log('✅', `Found ${keys.length} keys matching pattern`, GREEN);
      
      // Delete all matching keys
      for (const key of keys) {
        await client.del(key);
      }
      
      const remainingKeys = await client.keys('doubts:list:*');
      if (remainingKeys.length === 0) {
        log('✅', 'Pattern-based deletion working correctly', GREEN);
        testsPassed++;
      } else {
        log('❌', 'Pattern-based deletion incomplete', RED);
        testsFailed++;
      }
    } else {
      log('❌', 'Pattern search failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 8: Increment/Decrement (for counters)
    // ═══════════════════════════════════════════════════════════
    log('\n🔢', 'TEST 8: Counter Operations (INCR/DECR)', BLUE);
    
    await client.set('test:counter', '0');
    await client.incr('test:counter');
    await client.incr('test:counter');
    await client.incr('test:counter');
    const counterValue = await client.get('test:counter');
    
    if (counterValue === '3') {
      log('✅', 'Counter increment working correctly', GREEN);
      testsPassed++;
    } else {
      log('❌', 'Counter increment failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 9: Hash Operations (for user profiles)
    // ═══════════════════════════════════════════════════════════
    log('\n👤', 'TEST 9: Hash Operations (User Profile)', BLUE);
    
    await client.hSet('user:123', {
      name: 'Ansh Raj',
      email: 'ansh@studdy.com',
      points: '100',
      level: '5'
    });
    
    const userName = await client.hGet('user:123', 'name');
    const userPoints = await client.hGet('user:123', 'points');
    const allUserData = await client.hGetAll('user:123');
    
    if (userName === 'Ansh Raj' && userPoints === '100' && allUserData.level === '5') {
      log('✅', 'Hash operations working correctly', GREEN);
      testsPassed++;
    } else {
      log('❌', 'Hash operations failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 10: List Operations (for message queues)
    // ═══════════════════════════════════════════════════════════
    log('\n📝', 'TEST 10: List Operations (Message Queue)', BLUE);
    
    await client.del('test:messages'); // Clean up first
    await client.rPush('test:messages', ['msg1', 'msg2', 'msg3']);
    const listLength = await client.lLen('test:messages');
    const firstMsg = await client.lIndex('test:messages', 0);
    
    if (listLength === 3 && firstMsg === 'msg1') {
      log('✅', 'List operations working correctly', GREEN);
      testsPassed++;
    } else {
      log('❌', 'List operations failed', RED);
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // TEST 11: Redis Info & Stats
    // ═══════════════════════════════════════════════════════════
    log('\n📊', 'TEST 11: Redis Server Info', BLUE);
    
    const info = await client.info();
    const lines = info.split('\n');
    const memoryLine = lines.find(l => l.startsWith('used_memory_human'));
    const versionLine = lines.find(l => l.startsWith('redis_version'));
    const connectedClients = lines.find(l => l.startsWith('connected_clients'));
    
    log('ℹ️', `  ${versionLine}`, RESET);
    log('ℹ️', `  ${memoryLine}`, RESET);
    log('ℹ️', `  ${connectedClients}`, RESET);
    testsPassed++;
    
    // ═══════════════════════════════════════════════════════════
    // TEST 12: Performance Test (1000 operations)
    // ═══════════════════════════════════════════════════════════
    log('\n⚡', 'TEST 12: Performance Test (1000 SET operations)', BLUE);
    
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      await client.set(`perf:test:${i}`, `value${i}`);
    }
    const endTime = Date.now();
    const duration = endTime - startTime;
    const opsPerSecond = Math.floor(1000 / (duration / 1000));
    
    log('✅', `Completed 1000 operations in ${duration}ms (${opsPerSecond} ops/sec)`, GREEN);
    testsPassed++;
    
    // Clean up performance test keys
    for (let i = 0; i < 1000; i++) {
      await client.del(`perf:test:${i}`);
    }
    
    // ═══════════════════════════════════════════════════════════
    // Cleanup Test Data
    // ═══════════════════════════════════════════════════════════
    log('\n🧹', 'Cleaning up test data...', YELLOW);
    const testKeys = await client.keys('test:*');
    const userKeys = await client.keys('user:*');
    const allTestKeys = [...testKeys, ...userKeys];
    
    for (const key of allTestKeys) {
      await client.del(key);
    }
    log('✅', `Cleaned up ${allTestKeys.length} test keys`, GREEN);
    
    await client.quit();
    
  } catch (error) {
    log('❌', `Test failed: ${error.message}`, RED);
    testsFailed++;
  }
  
  // ═══════════════════════════════════════════════════════════
  // Final Results
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  log('📊', 'TEST RESULTS', BLUE);
  console.log('='.repeat(60));
  log('✅', `Tests Passed: ${testsPassed}`, GREEN);
  if (testsFailed > 0) {
    log('❌', `Tests Failed: ${testsFailed}`, RED);
  }
  const passRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  log('📈', `Success Rate: ${passRate}%`, passRate === '100.0' ? GREEN : YELLOW);
  console.log('='.repeat(60) + '\n');
  
  if (testsFailed === 0) {
    log('🎉', 'ALL TESTS PASSED! Redis is production-ready! 🚀', GREEN);
  } else {
    log('⚠️', 'Some tests failed. Please review the errors above.', YELLOW);
  }
};

// Run tests
testRedisOperations();
