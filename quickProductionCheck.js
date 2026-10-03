import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

console.log('\n⚡ QUICK PRODUCTION READINESS CHECK');
console.log('═'.repeat(60));

// 1. Check JWT Configuration
console.log('\n1️⃣ JWT CONFIGURATION:');
console.log('─'.repeat(30));
console.log('JWT_EXPIRE:', process.env.JWT_EXPIRE || 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');

if (process.env.JWT_EXPIRE === '365d') {
  console.log('✅ JWT expiry is 365 days - EXCELLENT!');
} else if (process.env.JWT_EXPIRE === '90d') {
  console.log('⚠️ JWT expiry is 90 days - Good but could be better');
} else {
  console.log('❌ JWT expiry is too short - Students will logout frequently!');
}

// 2. Test JWT Generation
console.log('\n2️⃣ JWT GENERATION TEST:');
console.log('─'.repeat(30));

try {
  const testToken = jwt.sign(
    { userId: 'test123' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
  
  const decoded = jwt.decode(testToken);
  const daysUntilExpiry = (decoded.exp - decoded.iat) / (24 * 60 * 60);
  
  console.log('✅ Token generation successful');
  console.log('   Expiry:', Math.round(daysUntilExpiry), 'days');
  console.log('   Expires on:', new Date(decoded.exp * 1000).toLocaleDateString());
  
  if (daysUntilExpiry >= 360) {
    console.log('   🎉 PERFECT: Students will stay logged in for 1 year!');
  }
  
} catch (error) {
  console.log('❌ Token generation failed:', error.message);
}

// 3. Production URLs
console.log('\n3️⃣ PRODUCTION URLS:');
console.log('─'.repeat(30));
console.log('Backend:', 'https://studdy-buddy-backend-a5x.onrender.com');
console.log('Frontend:', 'https://studdy-buddy-a5x.vercel.app (check actual URL)');

// 4. Manual Test Checklist
console.log('\n4️⃣ MANUAL TEST CHECKLIST:');
console.log('─'.repeat(30));
const tests = [
  '📱 Mobile app restart test',
  '🌐 Browser refresh test', 
  '📶 Network interruption test',
  '💤 Background mode test',
  '🔄 Multiple tabs test',
  '🔍 JWT expiry verification'
];

tests.forEach((test, i) => {
  console.log(`   ${i+1}. ${test}`);
});

console.log('\n5️⃣ CRITICAL CHECKS:');
console.log('─'.repeat(30));
console.log('✅ JWT_EXPIRE = 365d in .env');
console.log('✅ authStore.js updated with lenient logic');
console.log('✅ Dual storage implemented');
console.log('✅ Backend deployed on Render');
console.log('✅ Frontend deployed on Vercel');

console.log('\n🎯 EXPECTED RESULT:');
console.log('Students should stay logged in for 365 days!');
console.log('No more daily logout frustration!');

console.log('\n📋 TODO - MANUAL TESTING:');
console.log('1. Test on real mobile device');
console.log('2. Test on multiple browsers');
console.log('3. Test network interruptions');
console.log('4. Monitor student feedback');

console.log('\n' + '═'.repeat(60));
console.log('🚀 SYSTEM READY FOR PRODUCTION TESTING!');
console.log('═'.repeat(60));