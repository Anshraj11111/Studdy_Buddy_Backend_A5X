import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function checkTransformation() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Get a few students - same as admin controller does
    const students = await PreRegisteredStudent.find({})
      .limit(10)
      .select('name email schoolPassword schoolPasswordPlain isUsed');

    console.log('BEFORE TRANSFORMATION (Raw Database Data):');
    console.log('═'.repeat(70));
    students.forEach((student, idx) => {
      console.log(`\n${idx + 1}. ${student.name} (${student.email})`);
      console.log(`   schoolPassword: ${student.schoolPassword?.substring(0, 30)}...`);
      console.log(`   schoolPasswordPlain: "${student.schoolPasswordPlain || ''}"`);
      console.log(`   isEmpty: ${!student.schoolPasswordPlain || student.schoolPasswordPlain === ''}`);
    });

    console.log('\n\nAFTER TRANSFORMATION (What Admin Panel Should Show):');
    console.log('═'.repeat(70));
    
    // Apply the SAME transformation admin controller uses
    const transformed = students.map(student => {
      const obj = student.toObject();
      obj.schoolPassword = obj.schoolPasswordPlain || obj.schoolPassword;
      return obj;
    });

    transformed.forEach((student, idx) => {
      console.log(`\n${idx + 1}. ${student.name} (${student.email})`);
      console.log(`   schoolPassword (after transform): ${student.schoolPassword?.substring(0, 30)}...`);
      console.log(`   Is Plain Text?: ${student.schoolPassword?.length < 20 ? 'YES ✅' : 'NO ❌ (still hash)'}`);
    });

    console.log('\n\n💡 ANALYSIS:');
    console.log('═'.repeat(70));
    const withPlain = students.filter(s => s.schoolPasswordPlain && s.schoolPasswordPlain !== '').length;
    const withoutPlain = students.length - withPlain;
    
    console.log(`Students with plain password: ${withPlain} / ${students.length}`);
    console.log(`Students without plain password: ${withoutPlain} / ${students.length}`);
    
    if (withoutPlain > 0) {
      console.log('\n⚠️  Students without plain password will show HASH in admin panel');
      console.log('   This is EXPECTED because their plain passwords were never stored.');
      console.log('   Solution: Admin needs to edit these students and set new passwords.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTransformation();
