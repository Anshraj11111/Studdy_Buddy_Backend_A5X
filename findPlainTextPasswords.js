import mongoose from 'mongoose';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function findAndFixPlainPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database\n');
    
    // Find all users with schoolPassword
    const users = await User.find({ 
      schoolPassword: { $exists: true, $ne: null },
      role: 'student'
    }).select('name email schoolPassword').lean();
    
    console.log(`📊 Total students with school password: ${users.length}\n`);
    
    const plainTextUsers = [];
    const hashedUsers = [];
    
    for (const user of users) {
      const isHashed = user.schoolPassword?.startsWith('$2a$') || 
                       user.schoolPassword?.startsWith('$2b$') ||
                       user.schoolPassword?.length > 30;
      
      if (isHashed) {
        hashedUsers.push(user);
      } else {
        plainTextUsers.push(user);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Analysis:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Properly hashed: ${hashedUsers.length}`);
    console.log(`❌ Plain text: ${plainTextUsers.length}\n`);
    
    if (plainTextUsers.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  Users with PLAIN TEXT passwords:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      plainTextUsers.forEach((user, i) => {
        console.log(`${i + 1}. ${user.name} (${user.email})`);
        console.log(`   Password: ${user.schoolPassword}\n`);
      });
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔧 Fixing all plain text passwords...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      let fixed = 0;
      for (const userData of plainTextUsers) {
        const user = await User.findOne({ email: userData.email });
        if (user && user.schoolPassword) {
          const plainPassword = user.schoolPassword;
          const hashedPassword = await bcrypt.hash(plainPassword, 10);
          user.schoolPassword = hashedPassword;
          await user.save();
          console.log(`✅ Fixed: ${user.name}`);
          fixed++;
        }
      }
      
      console.log(`\n🎉 Successfully fixed ${fixed} users!\n`);
    } else {
      console.log('✅ All passwords are properly hashed!\n');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

findAndFixPlainPasswords();
