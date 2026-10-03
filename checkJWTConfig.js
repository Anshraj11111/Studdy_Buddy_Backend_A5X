import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║         JWT CONFIGURATION CHECK                                    ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

console.log('ENVIRONMENT VARIABLES:');
console.log('─'.repeat(70));
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('JWT_EXPIRE:', process.env.JWT_EXPIRE || 'NOT SET (default: 24h)');

// Test token generation
const testUserId = '507f1f77bcf86cd799439011';

try {
  const expiresIn = process.env.JWT_EXPIRE || '24h';
  const validatedExpiry = /^\d+$/.test(expiresIn) ? parseInt(expiresIn) : expiresIn;
  
  console.log('\nTOKEN GENERATION TEST:');
  console.log('─'.repeat(70));
  console.log('Raw JWT_EXPIRE:', process.env.JWT_EXPIRE);
  console.log('Validated expiry:', validatedExpiry);
  
  const token = jwt.sign(
    { userId: testUserId },
    process.env.JWT_SECRET,
    { expiresIn: validatedExpiry }
  );
  
  console.log('Generated token:', token.substring(0, 50) + '...');
  
  // Decode to check expiry
  const decoded = jwt.decode(token);
  console.log('\nTOKEN DETAILS:');
  console.log('─'.repeat(70));
  console.log('User ID:', decoded.userId);
  console.log('Issued at (iat):', new Date(decoded.iat * 1000).toLocaleString());
  console.log('Expires at (exp):', new Date(decoded.exp * 1000).toLocaleString());
  
  // Calculate days until expiry
  const now = Math.floor(Date.now() / 1000);
  const daysUntilExpiry = (decoded.exp - now) / (24 * 60 * 60);
  console.log('Days until expiry:', Math.round(daysUntilExpiry * 100) / 100);
  
  if (daysUntilExpiry >= 80) {
    console.log('✅ JWT expiry is correct (90 days)');
  } else if (daysUntilExpiry >= 25) {
    console.log('⚠️ JWT expiry is 30 days (could be better)');
  } else if (daysUntilExpiry >= 1) {
    console.log('❌ JWT expiry is only 1 day (too short!)');
  } else {
    console.log('🚨 JWT expiry is less than 1 day (very bad!)');
  }

} catch (error) {
  console.error('❌ JWT generation failed:', error.message);
}

console.log('\n' + '═'.repeat(70));
console.log('POSSIBLE ISSUES:');
console.log('═'.repeat(70));
console.log('1. Frontend not saving token properly');
console.log('2. Mobile app clearing token on restart');
console.log('3. Browser clearing localStorage');
console.log('4. Server restarting and JWT_SECRET changing');
console.log('5. Network issues causing auth failures');
console.log('\nSOLUTIONS:');
console.log('1. Check frontend token storage mechanism');
console.log('2. Add refresh token functionality');
console.log('3. Increase JWT expiry to 365 days for mobile app');
console.log('4. Add token persistence debugging');
console.log('═'.repeat(70));