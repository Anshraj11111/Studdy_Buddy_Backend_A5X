import mongoose from 'mongoose';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const students = [
  { name: 'YATI SHARMA', phone: '6266556794' },
  { name: 'AYUSH KUMAR YADAV', phone: '7701090584' }
];

function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateEmail(name) {
  // Remove special characters and dots, convert to lowercase
  const cleanName = name
    .toLowerCase()
    .replace(/[.\s]+/g, '')
    .replace(/[^a-z0-9]/g, '');
  return `${cleanName}@bardsley.edu`;
}

async function seedStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find an admin user or any user to use as createdBy
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      // If no admin, find any user
      adminUser = await User.findOne();
    }

    if (!adminUser) {
      console.log('❌ No users found in database. Please create a user first.');
      process.exit(1);
    }

    console.log(`📝 Using user: ${adminUser.name} (${adminUser.email}) as creator`);

    const studentsToAdd = students.map(student => ({
      name: student.name,
      email: generateEmail(student.name),
      phone: student.phone,
      schoolName: 'Bardsley',
      schoolPassword: generateRandomPassword(),
      isUsed: false,
      createdBy: adminUser._id
    }));

    // Check if students already exist
    for (const student of studentsToAdd) {
      const exists = await PreRegisteredStudent.findOne({ email: student.email });
      if (exists) {
        console.log(`⚠️  ${student.name} already exists with email ${student.email}`);
      } else {
        await PreRegisteredStudent.create(student);
        console.log(`✅ Added: ${student.name} - ${student.email} - Password: ${student.schoolPassword}`);
      }
    }

    console.log('\n🎉 Seeding completed!');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding students:', error);
    process.exit(1);
  }
}

seedStudents();
