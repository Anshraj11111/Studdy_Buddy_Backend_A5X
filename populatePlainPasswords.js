/**
 * MIGRATION: Populate schoolPasswordPlain field from PreRegisteredStudent records
 * 
 * Problem: Existing users don't have schoolPasswordPlain field
 * Solution: Match users with PreRegisteredStudent records and copy plain passwords
 * 
 * Usage: node populatePlainPasswords.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function populatePlainPasswords() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all students with school passwords but no plain password
    const students = await User.find({
      role: 'student',
      schoolPassword: { $exists: true, $ne: '' },
      $or: [
        { schoolPasswordPlain: { $exists: false } },
        { schoolPasswordPlain: '' }
      ]
    }).select('_id name email schoolName').lean();

    console.log(`📊 Found ${students.length} users needing plain passwords\n`);

    if (students.length === 0) {
      console.log('🎉 All users already have plain passwords!');
      await mongoose.connection.close();
      return;
    }

    // Get all PreRegisteredStudent records
    const preRegistered = await PreRegisteredStudent.find({}).select('email schoolPassword').lean();
    const emailToPassword = {};
    
    preRegistered.forEach(pr => {
      emailToPassword[pr.email] = pr.schoolPassword;
    });

    console.log(`📋 Found ${preRegistered.length} pre-registered records\n`);
    console.log('🔧 Starting migration...\n');

    let updated = 0;
    let notFound = 0;

    for (const student of students) {
      const plainPassword = emailToPassword[student.email];
      
      if (plainPassword) {
        await User.updateOne(
          { _id: student._id },
          { $set: { schoolPasswordPlain: plainPassword } }
        );
        updated++;
        console.log(`✅ ${updated}/${students.length} - ${student.name} (${student.email})`);
      } else {
        notFound++;
        console.log(`⚠️  No pre-registered record: ${student.name} (${student.email})`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully updated: ${updated} users`);
    console.log(`⚠️  Not found in pre-registered: ${notFound} users`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (notFound > 0) {
      console.log('💡 For users without pre-registered records:');
      console.log('   - Admin can manually set their school password from admin panel');
      console.log('   - Or they can re-register with school info\n');
    }

    console.log('✅ Migration complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

populatePlainPasswords();
