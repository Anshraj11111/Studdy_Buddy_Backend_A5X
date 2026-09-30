import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

/**
 * PROBLEM: 222 PreRegisteredStudent entries have hashed passwords but no plain text
 * SOLUTION: Generate NEW random passwords for each student
 * 
 * This script will:
 * 1. Find all PreReg entries without schoolPasswordPlain
 * 2. Generate a new 8-character password for each
 * 3. Store both hashed and plain versions
 * 4. Admin can then share these new passwords with students
 */

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function fixPlainPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Find all PreReg entries without plain password
    const studentsWithoutPlain = await PreRegisteredStudent.find({
      $or: [
        { schoolPasswordPlain: { $exists: false } },
        { schoolPasswordPlain: '' },
        { schoolPasswordPlain: null }
      ]
    });

    console.log(`📊 Found ${studentsWithoutPlain.length} students without plain passwords\n`);
    console.log('═'.repeat(70));
    console.log('GENERATING NEW PASSWORDS...');
    console.log('═'.repeat(70));

    let updated = 0;
    const passwordList = [];

    for (const student of studentsWithoutPlain) {
      // Generate new password
      const newPassword = generatePassword();
      
      // Hash and store
      student.schoolPassword = await bcrypt.hash(newPassword, 10);
      student.schoolPasswordPlain = newPassword;
      await student.save();

      passwordList.push({
        name: student.name,
        email: student.email,
        schoolName: student.schoolName,
        password: newPassword,
        status: student.isUsed ? 'USED' : 'PENDING'
      });

      updated++;

      if (updated % 50 === 0) {
        console.log(`✅ Processed ${updated} / ${studentsWithoutPlain.length}...`);
      }
    }

    console.log(`\n✅ Updated ${updated} students with new passwords\n`);

    // Display first 20 passwords for reference
    console.log('═'.repeat(70));
    console.log('SAMPLE PASSWORDS (First 20 students):');
    console.log('═'.repeat(70));
    
    passwordList.slice(0, 20).forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.name}`);
      console.log(`   Email: ${item.email}`);
      console.log(`   School: ${item.schoolName}`);
      console.log(`   Password: ${item.password}`);
      console.log(`   Status: ${item.status}`);
    });

    if (passwordList.length > 20) {
      console.log(`\n... and ${passwordList.length - 20} more students`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 ALL DONE!');
    console.log('═'.repeat(70));
    console.log('\n💡 What to do next:');
    console.log('  1. Restart backend server (if running)');
    console.log('  2. Open admin panel');
    console.log('  3. View PreRegistered Students section');
    console.log('  4. Passwords will now show as plain text');
    console.log('  5. Share passwords with students\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPlainPasswords();
