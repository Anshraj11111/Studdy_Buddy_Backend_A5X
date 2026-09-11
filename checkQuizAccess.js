/**
 * Quick check: Why quiz isn't showing
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function check() {
  try {
    console.log('🔌 Connecting...');
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    
    const Quiz = (await import('./src/models/Quiz.js')).default;
    const LectureProgress = (await import('./src/models/LectureProgress.js')).default;
    const Resource = (await import('./src/models/Resource.js')).default;
    const User = (await import('./src/models/User.js')).default;

    const student = await User.findOne({ email: 'baghelanshraj8@gmail.com' });
    console.log('\n📋 Student:', student.name);

    const lecture = await Resource.findOne({ title: /A5X Industries Orientation/ });
    console.log('📋 Lecture:', lecture.title, lecture._id.toString());

    const quiz = await Quiz.findOne({ lectureId: lecture._id });
    console.log('\n📋 Quiz exists:', quiz ? `YES - "${quiz.title}"` : 'NO');
    
    if (quiz) {
      console.log(`   - Quiz ID: ${quiz._id}`);
      console.log(`   - Lecture ID in Quiz: ${quiz.lectureId}`);
      console.log(`   - Questions: ${quiz.questions.length}`);
    }

    const progress = await LectureProgress.findOne({ 
      userId: student._id,
      lectureId: lecture._id
    });
    
    console.log('\n📋 Progress:', progress ? 'EXISTS' : 'NOT FOUND');
    if (progress) {
      console.log(`   - Watched: ${progress.watchedPercentage}%`);
      console.log(`   - isCompleted: ${progress.isCompleted}`);
      console.log(`   - User ID: ${progress.userId}`);
      console.log(`   - Lecture ID: ${progress.lectureId}`);
    }

    console.log('\n🔓 Quiz Access Decision:');
    if (!quiz) {
      console.log('   ❌ NO QUIZ - Quiz not found for this lecture');
    } else if (!progress) {
      console.log('   ❌ LOCKED - No progress record found');
    } else if (!progress.isCompleted) {
      console.log(`   ❌ LOCKED - Lecture not completed (${progress.watchedPercentage}% < 95%)`);
    } else {
      console.log('   ✅ UNLOCKED - All conditions met!');
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

check();
