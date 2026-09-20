/**
 * Fix PreRegisteredStudent status - mark registered students as "used"
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function fixStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all registered students
    const registeredStudents = await User.find({ role: 'student' }).select('email').lean();
    const registeredEmails = new Set(registeredStudents.map(u => u.email));

    console.log(`📊 Found ${registeredStudents.length} registered students\n`);

    // Find pre-registered students who are actually registered but not marked as used
    const notMarkedAsUsed = await PreRegisteredStudent.find({
      isUsed: false,
      email: { $in: Array.from(registeredEmails) }
    });

    console.log(`🔧 Found ${notMarkedAsUsed.length} students to mark as USED\n`);

    if (notMarkedAsUsed.length === 0) {
      console.log('✅ All pre-registered students are already correctly marked!');
      await mongoose.connection.close();
      return;
    }

    console.log('📝 Marking students as used...\n');

    let updated = 0;
    for (const student of notMarkedAsUsed) {
      await PreRegisteredStudent.updateOne(
        { _id: student._id },
        {
          $set: {
            isUsed: true,
            usedAt: new Date()
          }
        }
      );
      updated++;
      console.log(`✅ ${updated}/${notMarkedAsUsed.length} - ${student.name} (${student.email})`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully marked ${updated} students as USED`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verify
    const totalPreReg = await PreRegisteredStudent.countDocuments();
    const usedPreReg = await PreRegisteredStudent.countDocuments({ isUsed: true });
    const unusedPreReg = await PreRegisteredStudent.countDocuments({ isUsed: false });

    console.log('📊 UPDATED COUNTS:');
    console.log(`  Total Pre-Registered: ${totalPreReg}`);
    console.log(`  Used: ${usedPreReg}`);
    console.log(`  Unused: ${unusedPreReg}`);
    console.log(`  Math Check: ${usedPreReg} + ${unusedPreReg} = ${usedPreReg + unusedPreReg} ✅`);

    await mongoose.connection.close();
    console.log('\n✅ Fix complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

fixStatus();
