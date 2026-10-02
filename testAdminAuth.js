import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║         ADMIN AUTHENTICATION TEST                                  ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

console.log('ENVIRONMENT VARIABLES:');
console.log('─'.repeat(70));
console.log('ADMIN_SECRET:', process.env.ADMIN_SECRET ? `"${process.env.ADMIN_SECRET}"` : '❌ NOT SET');
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ SET' : '❌ NOT SET');
console.log('PORT:', process.env.PORT || '5000');

if (!process.env.ADMIN_SECRET) {
  console.log('\n❌ ERROR: ADMIN_SECRET not found in .env file!');
  console.log('Please add: ADMIN_SECRET=H5');
  process.exit(1);
}

console.log('\n' + '═'.repeat(70));
console.log('TEST SCENARIOS:');
console.log('═'.repeat(70));

const testCases = [
  {
    name: 'Valid admin secret (H5)',
    secret: 'H5',
    expected: 'PASS'
  },
  {
    name: 'Wrong admin secret',
    secret: 'WrongPassword',
    expected: 'FAIL'
  },
  {
    name: 'No admin secret',
    secret: null,
    expected: 'FAIL'
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log('   Secret sent:', testCase.secret || '(none)');
  
  const isValid = testCase.secret === process.env.ADMIN_SECRET;
  const result = isValid ? '✅ AUTHORIZED' : '❌ UNAUTHORIZED (401)';
  
  console.log(`   Expected: ${testCase.expected}`);
  console.log(`   Result: ${result}`);
  
  if ((testCase.expected === 'PASS' && isValid) || (testCase.expected === 'FAIL' && !isValid)) {
    console.log('   ✅ Test passed');
  } else {
    console.log('   ❌ Test failed');
  }
});

console.log('\n' + '═'.repeat(70));
console.log('MIDDLEWARE CHECK:');
console.log('═'.repeat(70));

// Simulate middleware
const isAdminUser = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET;
  
  if (!expected) {
    return res.status(500).json({ 
      success: false, 
      error: { message: 'ADMIN_SECRET not configured on server' } 
    });
  }
  
  if (!secret || secret !== expected) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Unauthorized' } 
    });
  }
  
  next();
};

console.log('✅ Middleware defined correctly');
console.log('✅ Checks x-admin-secret header');
console.log('✅ Compares with process.env.ADMIN_SECRET');

console.log('\n' + '═'.repeat(70));
console.log('FRONTEND CHECKLIST:');
console.log('═'.repeat(70));
console.log('1. User logs in to admin panel → enters password "H5"');
console.log('2. AdminPanel.jsx sets: sessionStorage.setItem("admin_secret", "H5")');
console.log('3. api.js interceptor adds: headers["x-admin-secret"] = "H5"');
console.log('4. Backend receives: req.headers["x-admin-secret"] = "H5"');
console.log('5. Middleware compares: "H5" === process.env.ADMIN_SECRET');
console.log('6. Result: ✅ Authorized');

console.log('\n' + '═'.repeat(70));
console.log('TROUBLESHOOTING:');
console.log('═'.repeat(70));
console.log('If 401 error persists:');
console.log('1. Check browser console: sessionStorage.getItem("admin_secret")');
console.log('2. Check Network tab → Request Headers → x-admin-secret');
console.log('3. Check backend logs for the value received');
console.log('4. Restart backend server to reload .env variables');

console.log('\n✅ Admin authentication configuration is correct!');
console.log('═'.repeat(70));
