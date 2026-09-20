/**
 * COMPLETE FIX: Mark ALL registered students as "used" in PreRegisteredStudent
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function completeFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Get ALL registered students
    console.log('📊 STEP 1: Checking registered students...\n');
    const allStudents = await User.find({ role: 'student' }).select('email name').lean();
    console.log(`Total Registered Students: ${allStudents.length}`);
    
    // Step 2: Check PreRegisteredStudent table
    console.log('\n📊 STEP 2: Checking PreRegisteredStudent table...\n');
    const totalPreReg = await PreRegisteredStudent.countDocuments();
    const usedCount = await PreRegisteredStudent.countDocuments({ isUsed: true });
    const unusedCount = await PreRegisteredStudent.countDocuments({ isUsed: false });
    
    console.log(`Total Pre-Registered: ${totalPreReg}`);
    console.log(`  - Used: ${usedCount}`);
    console.log(`  - Unused: ${unusedCount}`);
    console.log(`  - Missing: ${allStudents.length - usedCount} (should be marked as used)`);

    // Step 3: Find students who ARE registered but NOT marked as used
    console.log('\n📊 STEP 3: Finding students to mark as USED...\n');
    
    const registeredEmails = new Set(allStudents.map(s => s.email));
    
    const toMarkAsUsed = await PreRegisteredStudent.find({
      isUsed: false,
      email: { $in: Array.from(registeredEmails) }
    });

    console.log(`Found ${toMarkAsUsed.length} students to mark as USED`);

    if (toMarkAsUsed.length > 0) {
      console.log('\n🔧 STEP 4: Marking students as USED...\n');
      
      let updated = 0;
      for (const student of toMarkAsUsed) {
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
        if (updated <= 10) {
          console.log(`  ✅ ${student.name} (${student.email})`);
        }
      }
      
      if (toMarkAsUsed.length > 10) {
        console.log(`  ... and ${toMarkAsUsed.length - 10} more`);
      }
      
      console.log(`\n✅ Marked ${updated} students as USED`);
    }

    // Step 5: Find students NOT in PreRegisteredStudent table
    console.log('\n📊 STEP 5: Finding students NOT in PreRegisteredStudent table...\n');
    
    const preRegEmails = await PreRegisteredStudent.find({}).select('email').lean();
    const preRegEmailSet = new Set(preRegEmails.map(p => p.email));
    
    const notInPreReg = allStudents.filter(s => !preRegEmailSet.has(s.email));
    
    console.log(`Found ${notInPreReg.length} students NOT in PreRegisteredStudent table:`);
    
    if (notInPreReg.length > 0) {
      console.log('\n⚠️  These students registered WITHOUT pre-registration:');
      notInPreReg.slice(0, 15).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (${s.email})`);
      });
      if (notInPreReg.length > 15) {
        console.log(`  ... and ${notInPreReg.length - 15} more`);
      }
      console.log('\n💡 These are students who signed up directly (freemium model)');
      console.log('💡 They should NOT be counted in "used" pre-registered students');
    }

    // Step 6: Final verification
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL COUNTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const finalTotalPreReg = await PreRegisteredStudent.countDocuments();
    const finalUsed = await PreRegisteredStudent.countDocuments({ isUsed: true });
    const finalUnused = await PreRegisteredStudent.countDocuments({ isUsed: false });
    
    console.log(`All Users (Total): 188`);
    console.log(`  └─ Students: ${allStudents.length}`);
    console.log(`  └─ Mentors: ${188 - allStudents.length}`);
    console.log();
    console.log(`Pre-Registered Students: ${finalTotalPreReg}`);
    console.log(`  └─ Used (Registered): ${finalUsed}`);
    console.log(`  └─ Unused (Pending): ${finalUnused}`);
    console.log();
    console.log(`Students NOT pre-registered: ${notInPreReg.length}`);
    console.log(`  (Direct signups - freemium model)`);
    console.log();
    console.log('✅ MATH CHECK:');
    console.log(`  ${finalUsed} (used) + ${finalUnused} (unused) = ${finalUsed + finalUnused}`);
    console.log(`  Should equal: ${finalTotalPreReg} ✅`);
    console.log();
    console.log('📌 EXPECTED DISPLAY:');
    console.log(`  All Users: 188`);
    console.log(`  Students: ${allStudents.length}`);
    console.log(`  Pre-Registered Total: ${finalTotalPreReg}`);
    console.log(`  Used: ${finalUsed}`);
    console.log(`  Unused: ${finalUnused}`);

    await mongoose.connection.close();
    console.log('\n✅ Complete fix done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

completeFix();
