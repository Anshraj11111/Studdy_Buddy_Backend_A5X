import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

/**
 * Verification script to check all PreRegisteredStudent passwords are properly hashed
 */

async function verifyPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Find all PreRegisteredStudent entries
    const allPreReg = await PreRegisteredStudent.find({}).select('email schoolPassword schoolPasswordPlain');
    console.log(`📊 Total pre-registered students: ${allPreReg.length}\n`);

    let properlyHashed = 0;
    let plainText = 0;
    let empty = 0;
    const issues = [];

    for (const preReg of allPreReg) {
      const password = preReg.schoolPassword;
      
      if (!password || password === '') {
        empty++;
        issues.push({
          email: preReg.email,
          issue: 'Empty password',
        });
      } else if (password.match(/^\$2[aby]\$\d{2}\$/) && password.length === 60) {
        // Proper bcrypt hash
        properlyHashed++;
      } else {
        // Plain text detected
        plainText++;
        issues.push({
          email: preReg.email,
          issue: 'Plain text password',
          password: password,
        });
      }
    }

    console.log('═'.repeat(60));
    console.log('📈 VERIFICATION RESULTS:');
    console.log('═'.repeat(60));
    console.log(`✅ Properly Hashed:  ${properlyHashed} / ${allPreReg.length}`);
    console.log(`❌ Plain Text:       ${plainText} / ${allPreReg.length}`);
    console.log(`⚠️  Empty:            ${empty} / ${allPreReg.length}`);
    console.log('═'.repeat(60));

    if (issues.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:\n');
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.email}`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.password) {
          console.log(`   Password: ${issue.password}`);
        }
        console.log('');
      });
    } else {
      console.log('\n🎉 ALL PASSWORDS ARE PROPERLY HASHED!');
      console.log('✅ Database is secure and ready for production.\n');
    }

    // Check if schoolPasswordPlain field exists
    const withPlainField = allPreReg.filter(p => p.schoolPasswordPlain !== undefined).length;
    console.log(`\n📋 SchoolPasswordPlain field present: ${withPlainField} / ${allPreReg.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyPasswords();
