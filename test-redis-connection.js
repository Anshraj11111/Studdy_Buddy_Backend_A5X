import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const testRedisConnection = async () => {
  console.log('🔍 Testing Redis Connection...\n');
  
  const redisUrl = process.env.REDIS_URL;
  console.log('📍 Redis URL:', redisUrl?.substring(0, 50) + '...');
  
  try {
    const client = createClient({ 
      url: redisUrl,
      socket: {
        reconnectStrategy: false  // Don't retry in test
      }
    });
    
    client.on('error', (err) => {
      console.error('❌ Redis Error:', err.message);
    });
    
    client.on('ready', () => {
      console.log('✅ Redis Connected Successfully!');
    });
    
    console.log('⏳ Connecting to Redis...');
    await client.connect();
    
    // Test SET command
    console.log('\n📝 Testing SET command...');
    await client.set('test:connection', 'Hello from StuddyBuddy!', { EX: 60 });
    console.log('✅ SET command successful!');
    
    // Test GET command
    console.log('\n📖 Testing GET command...');
    const value = await client.get('test:connection');
    console.log('✅ GET command successful!');
    console.log('📦 Retrieved value:', value);
    
    // Test DELETE command
    console.log('\n🗑️  Testing DEL command...');
    await client.del('test:connection');
    console.log('✅ DEL command successful!');
    
    // Get Redis info
    console.log('\n📊 Redis Info:');
    const info = await client.info();
    const lines = info.split('\n');
    const memoryLine = lines.find(l => l.startsWith('used_memory_human'));
    const versionLine = lines.find(l => l.startsWith('redis_version'));
    console.log('  -', versionLine || 'Version: N/A');
    console.log('  -', memoryLine || 'Memory: N/A');
    
    await client.quit();
    console.log('\n✅ All Redis tests passed! Your Redis is ready for production! 🚀\n');
    
  } catch (error) {
    console.error('\n❌ Redis Connection Failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if REDIS_URL is correct in .env');
    console.log('   2. Verify Upstash database is active');
    console.log('   3. Check internet connection\n');
    process.exit(1);
  }
};

testRedisConnection();
