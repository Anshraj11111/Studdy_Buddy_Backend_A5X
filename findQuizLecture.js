import mongoose from 'mongoose';
import 'dotenv/config';

async function find() {
  await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
  
  const Quiz = (await import('./src/models/Quiz.js')).default;
  const Resource = (await import('./src/models/Resource.js')).default;

  const quiz = await Quiz.findOne().populate('lectureId');
  
  if (quiz) {
    console.log('✅ Found quiz:', quiz.title);
    console.log('   Lecture:', quiz.lectureId?.title || 'NOT FOUND');
    console.log('   Lecture ID:', quiz.lectureId?._id || quiz.lectureId);
  } else {
    console.log('❌ No quiz found in database');
  }

  await mongoose.connection.close();
  process.exit(0);
}

find();
