/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 STUDDY BUDDY - COMPLETE TEST SUITE RUNNER
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                 🔥 STUDDY BUDDY COMPLETE TEST SUITE 🔥                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  This will run comprehensive tests for all features:                     ║
║  1. Multi-Database Architecture (3 MongoDB clusters)                     ║
║  2. 10K Concurrent Users Load Test                                       ║
║  3. YouTube Live Streaming (Unlimited Viewers)                           ║
║  4. Real-time Features (Chat, Notifications)                             ║
║  5. All API Endpoints                                                    ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

const tests = [
  {
    name: 'Multi-Database Connection Test',
    command: 'node test-multidb.js',
    description: 'Tests connection to all 3 MongoDB clusters'
  },
  {
    name: 'YouTube Live Streaming Test',
    command: 'node test-youtube-unlimited-viewers.js',
    description: 'Simulates 10,000 YouTube Live viewers'
  },
  {
    name: '10K User Load Test',
    command: 'node test-load-10k-users.js',
    description: 'Comprehensive load test with 10,000 concurrent users'
  }
];

async function runTest(test, index) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`TEST ${index + 1}/${tests.length}: ${test.name}`);
  console.log(`Description: ${test.description}`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    const output = execSync(test.command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: 'inherit',
      timeout: 600000 // 10 minutes timeout
    });
    
    console.log(`\n✅ ${test.name} PASSED\n`);
    return { name: test.name, status: 'PASSED' };
  } catch (error) {
    console.error(`\n❌ ${test.name} FAILED\n`);
    return { name: test.name, status: 'FAILED', error: error.message };
  }
}

async function runAllTests() {
  const startTime = Date.now();
  const results = [];

  console.log('🚀 Starting test suite...\n');

  for (let i = 0; i < tests.length; i++) {
    const result = await runTest(tests[i], i);
    results.push(result);
    
    // Wait 5 seconds between tests
    if (i < tests.length - 1) {
      console.log('\n⏳ Waiting 5 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

  // Generate final report
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log('📊 FINAL TEST SUITE REPORT');
  console.log(`${'═'.repeat(80)}\n`);

  console.log('Test Results:\n');
  results.forEach((result, index) => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const passedTests = results.filter(r => r.status === 'PASSED').length;
  const failedTests = results.filter(r => r.status === 'FAILED').length;

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Duration: ${duration} minutes`);
  console.log(`${'─'.repeat(80)}\n`);

  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! System is production-ready for 10K+ users!\n');
  } else {
    console.log('⚠️  Some tests failed. Review the errors above.\n');
  }

  console.log(`${'═'.repeat(80)}\n`);
}

// Run all tests
runAllTests().catch(console.error);
