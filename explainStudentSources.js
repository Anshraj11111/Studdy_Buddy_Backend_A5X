/**
 * Explain WHERE all 180 students came from
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function explainSources() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 FINDING WHERE 180 STUDENTS CAME FROM');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get ALL students from User model
    const allStudents = await User.find({ role: 'student' }).select('email name createdAt schoolName').lean();
    console.log(`📊 TOTAL STUDENTS IN DATABASE: ${allStudents.length}\n`);

    // Get pre-registered students
    const allPreReg = await PreRegisteredStudent.find({}).select('email name isUsed').lean();
    const usedPreReg = allPreReg.filter(p => p.isUsed);
    const unusedPreReg = allPreReg.filter(p => !p.isUsed);

    console.log(`📋 PRE-REGISTERED TABLE:`);
    console.log(`  Total Pre-Registered: ${allPreReg.length}`);
    console.log(`  Used (claimed): ${usedPreReg.length}`);
    console.log(`  Unused (waiting): ${unusedPreReg.length}\n`);

    // Create email sets
    const allStudentEmails = new Set(allStudents.map(s => s.email));
    const preRegEmails = new Set(allPreReg.map(p => p.email));
    const usedPreRegEmails = new Set(usedPreReg.map(p => p.email));

    // Category 1: Students who WERE pre-registered and USED that pre-registration
    const fromPreReg = allStudents.filter(s => usedPreRegEmails.has(s.email));

    // Category 2: Students who registered WITHOUT pre-registration (direct signup)
    const directSignup = allStudents.filter(s => !preRegEmails.has(s.email));

    // Category 3: Students who WERE pre-registered but their "isUsed" flag is FALSE (bug/mismatch)
    const preRegButNotMarked = allStudents.filter(s => 
      preRegEmails.has(s.email) && !usedPreRegEmails.has(s.email)
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 BREAKDOWN OF 180 STUDENTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`1️⃣  FROM PRE-REGISTRATION (Used): ${fromPreReg.length} students`);
    console.log(`   └─ Admin ne pre-register kiya → Students ne account banaya`);
    console.log(`   └─ Ye "USED" mein show hote hain ✅\n`);

    console.log(`2️⃣  DIRECT SIGNUP (No Pre-Reg): ${directSignup.length} students`);
    console.log(`   └─ Students ne KHUD signup kiya (freemium model)`);
    console.log(`   └─ Kabhi pre-register NAHI the`);
    console.log(`   └─ Isliye "USED" mein NAHI dikhte ⚠️\n`);

    if (preRegButNotMarked.length > 0) {
      console.log(`3️⃣  PRE-REGISTERED BUT NOT MARKED: ${preRegButNotMarked.length} students`);
      console.log(`   └─ Bug: Registered but isUsed = false`);
      console.log(`   └─ Need to mark as "used" 🔧\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TOTAL CALCULATION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  ${fromPreReg.length} (pre-reg used)`);
    console.log(`+ ${directSignup.length} (direct signup)`);
    if (preRegButNotMarked.length > 0) {
      console.log(`+ ${preRegButNotMarked.length} (pre-reg not marked)`);
    }
    console.log(`────────────────────`);
    console.log(`= ${fromPreReg.length + directSignup.length + preRegButNotMarked.length} TOTAL STUDENTS ✅\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 ANSWER TO YOUR QUESTION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`"Jab total 180 hai aur 225 pre-registered hain,`);
    console.log(` aur sirf 98 used hain, toh 180 kahan se aaye?"\n`);
    console.log(`ANSWER:`);
    console.log(`  ✅ ${fromPreReg.length} students = Pre-Registration se (USED)`);
    console.log(`  ✅ ${directSignup.length} students = Direct Signup (NO pre-reg)`);
    if (preRegButNotMarked.length > 0) {
      console.log(`  ⚠️  ${preRegButNotMarked.length} students = Pre-reg but not marked (BUG)`);
    }
    console.log(`  ─────────────────────────────────────────────`);
    console.log(`  ✅ ${allStudents.length} TOTAL STUDENTS\n`);

    console.log(`💡 REMAINING ${unusedPreReg.length} pre-registrations = Students jo ABHI TAK signup NAHI kiye!\n`);

    if (directSignup.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 DIRECT SIGNUP STUDENTS (${directSignup.length}):`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      directSignup.slice(0, 20).forEach((s, i) => {
        const date = new Date(s.createdAt).toLocaleDateString();
        console.log(`  ${i + 1}. ${s.name} (${s.email}) - ${date}`);
      });
      if (directSignup.length > 20) {
        console.log(`  ... and ${directSignup.length - 20} more\n`);
      }
    }

    if (preRegButNotMarked.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`⚠️  BUG: PRE-REG BUT NOT MARKED (${preRegButNotMarked.length}):`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      preRegButNotMarked.slice(0, 10).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (${s.email})`);
      });
      if (preRegButNotMarked.length > 10) {
        console.log(`  ... and ${preRegButNotMarked.length - 10} more`);
      }
      console.log('\n💡 Run: node fixPreRegisteredStatus.js to mark them as USED\n');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

explainSources();
