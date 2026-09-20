/**
 * MIGRATION SCRIPT: Hash all plain text school passwords in database
 * 
 * Problem: 81 students have plain text schoolPassword (admin panel bug)
 * Solution: Hash them in BATCHES to avoid timeout
 * 
 * Usage: node hashPlainTextPasswords.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

dotenv.config();

const BATCH_SIZE = 20; // Process 20 users at a time
const SALT_ROUNDS = 10;

async function isPasswordHashed(password) {
  if (!password) return true; // Empty = no password
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars long
  return password.startsWith('$2') && password.length === 60;
}

async function hashPlainTextPasswords() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all students with school passwords
    console.log('🔍 Finding students with school passwords...');
    const allStudents = await User.find({
      role: 'student',
      schoolPassword: { $exists: true, $ne: '' }
    }).select('_id name email schoolPassword').lean();

    console.log(`📊 Total students with school passwords: ${allStudents.length}\n`);

    // Separate plain text from hashed
    const plainTextUsers = [];
    const hashedUsers = [];

    for (const user of allStudents) {
      const isHashed = await isPasswordHashed(user.schoolPassword);
      if (isHashed) {
        hashedUsers.push(user);
      } else {
        plainTextUsers.push(user);
      }
    }

    console.log(`✅ Already hashed: ${hashedUsers.length}`);
    console.log(`⚠️  Plain text passwords: ${plainTextUsers.length}\n`);

    if (plainTextUsers.length === 0) {
      console.log('🎉 All passwords are already hashed! Nothing to do.');
      await mongoose.connection.close();
      return;
    }

    console.log('🔧 Starting batch hashing process...\n');

    // Process in batches
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < plainTextUsers.length; i += BATCH_SIZE) {
      const batch = plainTextUsers.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(plainTextUsers.length / BATCH_SIZE);

      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} users):`);

      for (const user of batch) {
        try {
          // Hash the plain text password
          const hashedPassword = await bcrypt.hash(user.schoolPassword, SALT_ROUNDS);

          // Update in database
          await User.updateOne(
            { _id: user._id },
            { $set: { schoolPassword: hashedPassword } }
          );

          processed++;
          succeeded++;
          console.log(`  ✅ ${processed}/${plainTextUsers.length} - ${user.name} (${user.email})`);
        } catch (err) {
          failed++;
          console.error(`  ❌ Failed: ${user.name} (${user.email}) - ${err.message}`);
        }
      }

      console.log(); // Empty line between batches
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully hashed: ${succeeded} passwords`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed} passwords`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔍 Verifying results...');
    const remainingPlainText = await User.countDocuments({
      role: 'student',
      schoolPassword: { $exists: true, $ne: '', $not: /^\$2[aby]\$/ }
    });

    if (remainingPlainText === 0) {
      console.log('✅ All passwords are now hashed!');
    } else {
      console.log(`⚠️  ${remainingPlainText} plain text passwords still remain (may need manual check)`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Migration complete. Database connection closed.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
hashPlainTextPasswords();
