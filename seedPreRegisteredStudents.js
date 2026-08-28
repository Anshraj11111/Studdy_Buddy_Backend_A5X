import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const students = [
  { name: 'YATI SHARMA', phone: '6266556794' },
  { name: 'JASNOOR KAUR', phone: '9557451849' },
  { name: 'ARSHITA SHRIVASTAVA', phone: '9589362757' },
  { name: 'SWARNIMA GOUR', phone: '8103180021' },
  { name: 'ADITYA SINGH', phone: '9981816593' },
  { name: 'AARAV SHUKLA', phone: '8108567333' },
  { name: 'ANSHIKA SINGH', phone: '9893690839' },
  { name: 'PRAGYAN SONI', phone: '9826706228' },
  { name: 'MOHD FARIDI', phone: '9424665232' },
  { name: 'ARADHYA SHRIVASTAVA', phone: '8871251195' },
  { name: 'ARADHYA KOSTA', phone: '9755957460' },
  { name: 'FATIMA ZAHRA', phone: '7999727614' },
  { name: 'SAANVI SHRI', phone: '7987255348' },
  { name: 'YASHASHVI PITALE', phone: '7000898498' },
  { name: 'GOURI KASTOR', phone: '6260080008' },
  { name: 'ANVESHA GUPTA', phone: '9407000144' },
  { name: 'ABHIRAJ SHRIVASTAVA', phone: '9111395339' },
  { name: 'SOUMYA RAJAK', phone: '7725856177' },
  { name: 'ANMOL KHATRI', phone: '6264458992' },
  { name: 'SONAKSHI TIWARI', phone: '8358982097' },
  { name: 'SHOURYA RAJAK', phone: '9300835773' },
  { name: 'ARYAN AGRAWAL', phone: '9630220316' },
  { name: 'SHOURYA GUPTA', phone: '7805978111' },
  { name: 'ADITI MISHRA', phone: '7898517752' }
];

const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const generateEmail = (name) => {
  return name.toLowerCase().replace(/\s+/g, '.') + '@student.com';
};

async function seedStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('Connected to MongoDB');

    const anyUser = await mongoose.connection.db.collection('users').findOne({});
    const createdById = anyUser ? anyUser._id : new mongoose.Types.ObjectId();

    const studentsData = students.map(student => ({
      name: student.name,
      email: generateEmail(student.name),
      phone: student.phone,
      schoolName: 'Bardsley',
      schoolPassword: generatePassword(),
      isUsed: false,
      createdBy: createdById
    }));

    const result = await PreRegisteredStudent.insertMany(studentsData);
    
    console.log('Successfully added students!');
    result.forEach((student, index) => {
      console.log((index + 1) + ' | ' + student.name + ' | ' + student.email + ' | ' + student.phone + ' | ' + student.schoolName + ' | ' + student.schoolPassword);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedStudents();
