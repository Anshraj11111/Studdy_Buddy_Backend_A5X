/**
 * Find LAKSHYA TIWARI in database
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();

async function findLakshya() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Search by name
    const users = await User.find({
      name: { $regex: 'lakshya', $options: 'i' }
    }).select('name email schoolName schoolPassword').lean();

    console.log(`Found ${users.length} users matching "LAKSHYA":\n`);

    users.forEach((user, i) => {
      console.log(`${i + 1}. Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   School: ${user.schoolName}`);
      console.log(`   Has Password: ${user.schoolPassword ? 'YES' : 'NO'}`);
      console.log();
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

findLakshya();
