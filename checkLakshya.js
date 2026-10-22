import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/studdy_buddy';
console.log('🔌 Connecting to:', mongoUri.substring(0, 50) + '...\n');

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('🔍 Searching for Lakshya Tiwari...\n');
    
    // First, try exact match
    let user = await User.findOne({ email: 'lakshya.tiwari@student.com' }).select('+password');
    
    if (!user) {
      console.log('❌ Not found by email, searching by name...');
      user = await User.findOne({ name: /lakshya.*tiwari/i }).select('+password');
    }
    
    if (!user) {
      console.log('❌ Not found by name either, searching all users with "lakshya"...');
      const users = await User.find({ name: /lakshya/i }).select('name email schoolCode').limit(10);
      console.log('\n📋 Found', users.length, 'user(s) with "lakshya" in name:');
      users.forEach((u, i) => {
        console.log(`${i + 1}. ${u.name} - ${u.email} - ${u.schoolCode || 'No school'}`);
      });
      
      if (users.length === 0) {
        console.log('\n❌ No users found with "lakshya" in name!');
        console.log('Checking total users in database...');
        const totalUsers = await User.countDocuments();
        console.log('Total users:', totalUsers);
      }
      
      process.exit(0);
    }
    
    console.log('✅ User Found!\n');
    console.log('📋 Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('School Code:', user.schoolCode);
    console.log('School Password:', user.schoolPassword);
    console.log('City:', user.city || 'Not set');
    console.log('XP:', user.xp);
    console.log('Created:', user.createdAt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check password
    console.log('🔐 Password Check:');
    console.log('Has Password:', user.password ? 'YES' : 'NO');
    console.log('Password Type:', typeof user.password);
    console.log('Password Length:', user.password ? user.password.length : 0);
    console.log('Password (hashed):', user.password ? user.password.substring(0, 50) + '...' : 'NONE');
    
    // Check if it's a bcrypt hash
    const isBcryptHash = user.password && user.password.startsWith('$2');
    console.log('Is Bcrypt Hash:', isBcryptHash ? 'YES' : 'NO');
    
    if (!user.password || !isBcryptHash) {
      console.log('\n⚠️  WARNING: Password missing or not properly hashed!');
      console.log('This will cause login to fail.');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
