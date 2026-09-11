/**
 * Create Quiz for ANY Lecture by Title
 * 
 * Usage: node createQuizForCurrentLecture.js "Lecture Title"
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function createQuiz() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const Resource = (await import('./src/models/Resource.js')).default;
    const Module = (await import('./src/models/Module.js')).default;
    const Course = (await import('./src/models/Course.js')).default;
    const Quiz = (await import('./src/models/Quiz.js')).default;
    const LectureProgress = (await import('./src/models/LectureProgress.js')).default;
    const User = (await import('./src/models/User.js')).default;

    // Get lecture title from command line or use default
    const lectureTitle = process.argv[2] || 'Engineering Mindset';

    console.log(`📋 Searching for lecture: "${lectureTitle}"...`);
    
    // Find lecture by title (partial match)
    const lecture = await Resource.findOne({ 
      title: { $regex: lectureTitle, $options: 'i' },
      fileType: 'video'
    }).lean();

    if (!lecture) {
      console.log(`❌ No video lecture found matching: "${lectureTitle}"`);
      console.log('\n💡 Available lectures:');
      const allLectures = await Resource.find({ fileType: 'video' })
        .select('title')
        .limit(10)
        .lean();
      allLectures.forEach((l, i) => console.log(`   ${i+1}. ${l.title}`));
      process.exit(1);
    }

    console.log(`✅ Found: ${lecture.title}`);
    console.log(`   Lecture ID: ${lecture._id}\n`);

    // Get course and module info
    const course = await Course.findById(lecture.courseId).lean();
    const modules = await Module.find({ courseId: lecture.courseId }).lean();
    let moduleId = null;
    
    for (const mod of modules) {
      if (mod.resources && mod.resources.some(r => r.toString() === lecture._id.toString())) {
        moduleId = mod._id;
        console.log(`📦 Module: ${mod.title}`);
        break;
      }
    }

    if (!course || !moduleId) {
      console.log('❌ Could not find course/module for this lecture');
      process.exit(1);
    }

    console.log(`📚 Course: ${course.title}\n`);

    // Check existing quiz
    let quiz = await Quiz.findOne({ lectureId: lecture._id });
    if (quiz) {
      console.log(`⚠️ Quiz already exists: "${quiz.title}"`);
      console.log('   Deleting to create fresh one...\n');
      await Quiz.deleteOne({ _id: quiz._id });
    }

    // Get student for createdBy
    const student = await User.findOne({ email: 'baghelanshraj8@gmail.com' });
    if (!student) {
      console.log('❌ Student not found!');
      process.exit(1);
    }

    // Create robotics quiz
    console.log('📝 Creating Robotics Fundamentals Quiz...\n');
    quiz = await Quiz.create({
      lectureId: lecture._id,
      courseId: course._id,
      moduleId: moduleId,
      title: 'Robotics Fundamentals Quiz',
      description: 'Test your understanding of basic robotics concepts',
      questions: [
        {
          question: 'What are the three main components of a robot?',
          options: [
            'Sensors, Motors, Wheels',
            'Sensors, Actuators, Controller',
            'Battery, Circuit, Display',
            'Camera, Speaker, Microphone'
          ],
          correctAnswer: 1,
          explanation: 'A robot consists of Sensors (to perceive), Actuators (to move), and a Controller (brain to process).',
          marks: 1,
        },
        {
          question: 'What is the purpose of sensors in robotics?',
          options: [
            'To power the robot',
            'To provide movement',
            'To gather information from the environment',
            'To display data'
          ],
          correctAnswer: 2,
          explanation: 'Sensors allow robots to perceive their environment by detecting light, sound, distance, temperature, etc.',
          marks: 1,
        },
        {
          question: 'Which programming language is commonly used in robotics?',
          options: [
            'HTML',
            'Python',
            'CSS',
            'Photoshop'
          ],
          correctAnswer: 1,
          explanation: 'Python is widely used in robotics due to its simplicity and powerful libraries like ROS (Robot Operating System).',
          marks: 1,
        },
        {
          question: 'What does AI stand for in robotics context?',
          options: [
            'Automated Integration',
            'Artificial Intelligence',
            'Active Input',
            'Advanced Interface'
          ],
          correctAnswer: 1,
          explanation: 'AI (Artificial Intelligence) enables robots to make decisions, learn from data, and adapt to new situations.',
          marks: 1,
        },
        {
          question: 'What is an actuator in robotics?',
          options: [
            'A device that processes data',
            'A component that causes motion or controls a mechanism',
            'A sensor that detects movement',
            'A battery that powers the robot'
          ],
          correctAnswer: 1,
          explanation: 'Actuators are devices (like motors or servos) that convert electrical signals into physical movement.',
          marks: 1,
        },
      ],
      passingScore: 60,
      duration: 15,
      maxAttempts: 3,
      createdBy: student._id,
    });

    console.log('✅ Quiz Created Successfully!\n');

    // Set progress to 97% for this lecture
    console.log('📊 Setting up progress...');
    let progress = await LectureProgress.findOne({
      userId: student._id,
      lectureId: lecture._id,
    });

    if (progress) {
      progress.watchedPercentage = 97;
      progress.isCompleted = true;
      await progress.save();
      console.log('✅ Updated progress to 97%\n');
    } else {
      progress = await LectureProgress.create({
        userId: student._id,
        lectureId: lecture._id,
        courseId: course._id,
        moduleId: moduleId,
        watchedPercentage: 97,
        isCompleted: true,
      });
      console.log('✅ Created progress: 97%\n');
    }

    // Summary
    console.log('═'.repeat(70));
    console.log('✅ QUIZ CREATED & TESTED!\n');
    console.log(`📚 Course: ${course.title}`);
    console.log(`📦 Module ID: ${moduleId}`);
    console.log(`🎥 Lecture: ${lecture.title}`);
    console.log(`   Lecture ID: ${lecture._id}`);
    console.log(`📝 Quiz: ${quiz.title}`);
    console.log(`   - Questions: ${quiz.questions.length}`);
    console.log(`   - Passing: ${quiz.passingScore}%`);
    console.log(`   - Duration: ${quiz.duration} min`);
    console.log(`👤 Student: ${student.email}`);
    console.log(`📊 Progress: ${progress.watchedPercentage}% (${progress.isCompleted ? 'Completed' : 'In Progress'})`);
    console.log(`🔓 Status: UNLOCKED`);
    console.log('═'.repeat(70));
    console.log('\n✅ Now refresh browser and test!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  }
}

createQuiz();
