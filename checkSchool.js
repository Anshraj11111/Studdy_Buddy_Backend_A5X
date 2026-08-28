import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function checkStudents() {
  await mongoose.connect(process.env.MONGO_URI_PRIMARY);
  const students = await PreRegisteredStudent.find().limit(5);
  students.forEach(s => {
    console.log('Name: ' + s.name + ' | School: ' + s.schoolName + ' | Password: ' + s.schoolPassword);
  });
  await mongoose.disconnect();
  process.exit(0);
}

checkStudents();
