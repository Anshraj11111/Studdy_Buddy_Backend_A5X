import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function updateSchoolCode() {
  await mongoose.connect(process.env.MONGO_URI_PRIMARY);
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const collection = db.collection('preregisteredstudents');
  
  const result = await collection.updateMany(
    {},
    { $set: { schoolName: 'Bardsley' } }
  );
  
  console.log('Updated ' + result.modifiedCount + ' students');
  
  const sample = await collection.findOne();
  console.log('Sample - Name: ' + sample.name + ' | School: ' + sample.schoolName);
  
  await mongoose.disconnect();
  process.exit(0);
}

updateSchoolCode();
