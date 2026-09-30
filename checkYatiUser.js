import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const email = 'yatisharma@student.com'; // Without dot

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Check User collection
    console.log('🔍 Checking User collection...');
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (user) {
      console.log('✅ Found in User collection:');
      console.log('═'.repeat(60));
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('School Name:', user.schoolName || 'N/A');
      console.log('Has Password:', user.password ? 'YES' : 'NO');
      console.log('Has School Password:', user.schoolPassword ? 'YES' : 'NO');
      console.log('School Password Plain:', user.schoolPasswordPlain || 'N/A');
      console.log('Created At:', user.createdAt);
      console.log('═'.repeat(60));
    } else {
      console.log('❌ Not found in User collection');
    }

    // Check PreRegisteredStudent collection
    console.log('\n🔍 Checking PreRegisteredStudent collection...');
    const preReg = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (preReg) {
      console.log('✅ Found in PreRegisteredStudent collection:');
      console.log('═'.repeat(60));
      console.log('Name:', preReg.name);
      console.log('Email:', preReg.email);
      console.log('School Name:', preReg.schoolName);
      console.log('School Password (hashed):', preReg.schoolPassword ? 'YES' : 'NO');
      console.log('School Password Plain:', preReg.schoolPasswordPlain || 'N/A');
      console.log('Is Used:', preReg.isUsed);
      console.log('Used At:', preReg.usedAt || 'N/A');
      console.log('═'.repeat(60));

      // If user exists and has personal password, test it
      if (user && user.password) {
        console.log('\n🔐 PASSWORD VALIDATION TEST:');
        console.log('═'.repeat(60));
        
        // Test with common test passwords
        const testPasswords = ['password', '12345678', 'yati123', 'Password123'];
        
        for (const testPwd of testPasswords) {
          const isValid = await bcrypt.compare(testPwd, user.password);
          if (isValid) {
            console.log(`✅ Personal Password: "${testPwd}"`);
            break;
          }
        }
        
        console.log('═'.repeat(60));
      }
    } else {
      console.log('❌ Not found in PreRegisteredStudent collection');
    }

    console.log('\n💡 RECOMMENDATION:');
    console.log('═'.repeat(60));
    if (user && !preReg) {
      console.log('User exists but no PreReg entry found.');
      console.log('User should login with PERSONAL password only.');
      console.log('School password login will NOT work.');
    } else if (user && preReg && preReg.isUsed) {
      console.log('User already signed up and used PreReg entry.');
      console.log('User should login with PERSONAL password.');
      console.log(`School password: ${preReg.schoolPasswordPlain || 'Not available'}`);
    } else if (!user && preReg) {
      console.log('PreReg entry exists but user not created yet.');
      console.log('User needs to complete SIGNUP first.');
    }
    console.log('═'.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUser();
