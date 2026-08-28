import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function updateSchoolCode() {
  await mongoose.connect(process.env.MONGO_URI_PRIMARY);
  console.log('Connected to MongoDB');
  
  const result = await PreRegisteredStudent.updateMany(
    {},
    { $set: { schoolName: 'Bardsley' } }
  );
  
  console.log('Updated ' + result.modifiedCount + ' students');
  console.log('Total matched: ' + result.matchedCount);
  
  const sample = await PreRegisteredStudent.findOne();
  console.log('Sample student - Name: ' + sample.name + ' | School: ' + sample.schoolName);
  
  await mongoose.disconnect();
  process.exit(0);
}

updateSchoolCode();
