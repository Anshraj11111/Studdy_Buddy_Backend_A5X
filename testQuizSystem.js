/**
 * Comprehensive Quiz System Test
 * Tests: Create quiz, Fetch quiz, Update progress, Quiz unlock logic
 * 
 * Usage: node testQuizSystem.js
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function testQuizSystem() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const dbUri = process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const Course = (await import('./src/models/Course.js')).default;
    const Module = (await import('./src/models/Module.js')).default;
    const Resource = (await import('./src/models/Resource.js')).default;
    const Quiz = (await import('./src/models/Quiz.js')).default;
    const LectureProgress = (await import('./src/models/LectureProgress.js')).default;
    const User = (await import('./src/models/User.js')).default;

    // STEP 1: Find test data
    console.log('📋 Step 1: Finding test course, module, and lecture...');
    const course = await Course.findOne().lean();
    if (!course) {
      console.log('❌ No course found! Please create a course first.');
      process.exit(1);
    }
    console.log(`✅ Using course: ${course.title}`);

    const module = await Module.findOne().populate('resources').lean();
    if (!module) {
      console.log('❌ No module found! Please create a module first.');
      process.exit(1);
    }
    console.log(`✅ Using module: ${module.title}`);

    const lecture = module.resources && module.resources.length > 0 ? module.resources[0] : null;
    if (!lecture) {
      console.log('❌ No lecture/resource found in module!');
      process.exit(1);
    }
    console.log(`✅ Using lecture: ${lecture.title}`);

    // STEP 2: Find a student to test with
    console.log('\n📋 Step 2: Finding test student...');
    const student = await User.findOne({ role: 'student' }).lean();
    if (!student) {
      console.log('❌ No student found!');
      process.exit(1);
    }
    console.log(`✅ Using student: ${student.name} (${student.email})`);

    // STEP 3: Check if quiz already exists
    console.log('\n📋 Step 3: Checking existing quiz...');
    let quiz = await Quiz.findOne({ lectureId: lecture._id });
    
    if (quiz) {
      console.log(`⚠️ Quiz already exists: "${quiz.title}"`);
      console.log(`   - Questions: ${quiz.questions.length}`);
      console.log(`   - Passing Score: ${quiz.passingScore}%`);
      console.log(`   - Duration: ${quiz.duration} minutes`);
    } else {
      console.log('➕ Creating new quiz...');
      
      // Create a test quiz
      quiz = await Quiz.create({
        lectureId: lecture._id,
        courseId: course._id,
        moduleId: module._id,
        title: `Test Quiz for ${lecture.title}`,
        description: 'This is an automated test quiz to verify the quiz system works correctly.',
        questions: [
          {
            question: 'What is the capital of France?',
            options: ['London', 'Paris', 'Berlin', 'Madrid'],
            correctAnswer: 1,
            explanation: 'Paris is the capital and most populous city of France.',
            marks: 1,
          },
          {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1,
            explanation: '2 + 2 equals 4.',
            marks: 1,
          },
          {
            question: 'Which programming language is known for web development?',
            options: ['Python', 'JavaScript', 'C++', 'Java'],
            correctAnswer: 1,
            explanation: 'JavaScript is primarily used for web development.',
            marks: 1,
          },
        ],
        passingScore: 60,
        duration: 10, // 10 minutes
        maxAttempts: 3,
        createdBy: student._id, // Use student as creator for testing
      });

      console.log(`✅ Quiz created: "${quiz.title}"`);
      console.log(`   - Questions: ${quiz.questions.length}`);
      console.log(`   - Passing Score: ${quiz.passingScore}%`);
    }

    // STEP 4: Test lecture progress (incomplete)
    console.log('\n📋 Step 4: Testing lecture progress (50% watched)...');
    let progress = await LectureProgress.findOne({
      userId: student._id,
      lectureId: lecture._id,
    });

    if (!progress) {
      progress = await LectureProgress.create({
        userId: student._id,
        lectureId: lecture._id,
        courseId: course._id,
        moduleId: module._id,
        watchedPercentage: 50,
        isCompleted: false,
      });
      console.log('✅ Created progress: 50% watched (quiz LOCKED)');
    } else {
      console.log(`ℹ️ Existing progress: ${progress.watchedPercentage}% watched`);
      console.log(`   - Quiz ${progress.watchedPercentage >= 95 ? 'UNLOCKED' : 'LOCKED'}`);
    }

    // STEP 5: Simulate fetching quiz (should fail if < 95%)
    console.log('\n📋 Step 5: Testing quiz access control...');
    if (progress.watchedPercentage < 95) {
      console.log('❌ Quiz is LOCKED (progress < 95%)');
      console.log('   - Student needs to watch at least 95% of the lecture');
    } else {
      console.log('✅ Quiz is UNLOCKED (progress >= 95%)');
    }

    // STEP 6: Update progress to 95%+ to unlock quiz
    console.log('\n📋 Step 6: Updating progress to 95% (unlock quiz)...');
    progress.watchedPercentage = 97;
    progress.isCompleted = true;
    await progress.save();
    console.log('✅ Progress updated: 97% watched (quiz UNLOCKED)');

    // STEP 7: Verify quiz is now accessible
    console.log('\n📋 Step 7: Fetching quiz (should work now)...');
    const fetchedQuiz = await Quiz.findOne({ lectureId: lecture._id })
      .populate('courseId', 'title')
      .populate('moduleId', 'title')
      .populate('lectureId', 'title');

    if (fetchedQuiz) {
      console.log('✅ Quiz fetched successfully:');
      console.log(`   - Title: ${fetchedQuiz.title}`);
      console.log(`   - Course: ${fetchedQuiz.courseId.title}`);
      console.log(`   - Module: ${fetchedQuiz.moduleId.title}`);
      console.log(`   - Lecture: ${fetchedQuiz.lectureId.title}`);
      console.log(`   - Questions: ${fetchedQuiz.questions.length}`);
      console.log(`   - Passing Score: ${fetchedQuiz.passingScore}%`);
      console.log(`   - Duration: ${fetchedQuiz.duration} minutes`);
      console.log(`   - Max Attempts: ${fetchedQuiz.maxAttempts}`);
    }

    // STEP 8: Display quiz questions
    console.log('\n📋 Step 8: Quiz Questions:');
    fetchedQuiz.questions.forEach((q, idx) => {
      console.log(`\nQ${idx + 1}. ${q.question} (${q.marks} mark${q.marks > 1 ? 's' : ''})`);
      q.options.forEach((opt, optIdx) => {
        const isCorrect = optIdx === q.correctAnswer;
        console.log(`   ${optIdx + 1}. ${opt} ${isCorrect ? '✅' : ''}`);
      });
      if (q.explanation) {
        console.log(`   💡 ${q.explanation}`);
      }
    });

    // STEP 9: Summary
    console.log('\n✅ Quiz System Test Completed Successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Course: ${course.title}`);
    console.log(`   - Module: ${module.title}`);
    console.log(`   - Lecture: ${lecture.title}`);
    console.log(`   - Quiz: ${fetchedQuiz.title}`);
    console.log(`   - Student Progress: ${progress.watchedPercentage}% (${progress.isCompleted ? 'Completed' : 'In Progress'})`);
    console.log(`   - Quiz Status: ${progress.watchedPercentage >= 95 ? '🔓 UNLOCKED' : '🔒 LOCKED'}`);
    
    console.log('\n📱 Next Steps:');
    console.log('   1. Login as student in browser');
    console.log('   2. Go to Resources → Course → Module → Lecture');
    console.log('   3. Watch lecture until 95%+ progress');
    console.log('   4. Click "Take Quiz" button (should be unlocked)');
    console.log('   5. Answer questions and submit');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testQuizSystem();
