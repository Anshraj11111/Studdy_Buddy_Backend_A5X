import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('🔍 Checking ALL PreRegistered Students...\n');
    
    const allPreReg = await PreRegisteredStudent.find({}).sort({ schoolName: 1 });
    
    console.log(`📊 Total PreReg Students: ${allPreReg.length}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let bcryptCount = 0;
    let plainTextCount = 0;
    let emptyCount = 0;
    const bcryptUsers = [];
    
    allPreReg.forEach((student, i) => {
      const pwd = student.schoolPassword;
      let pwdType = '';
      
      if (!pwd || pwd === '') {
        pwdType = '❌ EMPTY';
        emptyCount++;
      } else if (pwd.startsWith('$2')) {
        pwdType = '⚠️  BCRYPT HASH (needs fix)';
        bcryptCount++;
        bcryptUsers.push(student);
      } else {
        pwdType = '✅ PLAIN TEXT (ok)';
        plainTextCount++;
      }
      
      console.log(`${i + 1}. ${student.name}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   School: ${student.schoolName}`);
      console.log(`   Password: ${pwd ? (pwd.startsWith('$2') ? pwd.substring(0, 30) + '...' : pwd) : 'NONE'}`);
      console.log(`   Type: ${pwdType}`);
      console.log(`   Used: ${student.isUsed ? '✅ Yes' : '❌ No (not registered yet)'}`);
      console.log();
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Plain text passwords: ${plainTextCount}`);
    console.log(`⚠️  Bcrypt hash passwords: ${bcryptCount}`);
    console.log(`❌ Empty passwords: ${emptyCount}`);
    
    if (bcryptUsers.length > 0) {
      console.log('\n⚠️  THESE USERS CANNOT LOGIN WITH SCHOOL PASSWORD:');
      bcryptUsers.forEach(u => {
        console.log(`   - ${u.name} (${u.email}) - School: ${u.schoolName}`);
      });
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
