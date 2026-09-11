/**
 * Seed Robotics Course with Modules and Lectures
 * Creates complete course structure with sample videos
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function seedModules() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const Course = (await import('./src/models/Course.js')).default;
    const Module = (await import('./src/models/Module.js')).default;
    const Resource = (await import('./src/models/Resource.js')).default;
    const User = (await import('./src/models/User.js')).default;

    // Find any user to use as uploadedBy
    console.log('📋 Finding user...');
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No user found! Please create at least one user first.');
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.name} (${user.role})\n`);

    // Find Robotics course
    console.log('📋 Finding Robotics course...');
    const course = await Course.findOne({ title: /Robotics/ });
    if (!course) {
      console.log('❌ Robotics course not found!');
      process.exit(1);
    }
    console.log(`✅ Found: ${course.title}\n`);

    // Module 1: Introduction to Robotics
    console.log('📦 Creating Module 1: Introduction to Robotics...');
    
    // Create lectures for Module 1
    const module1Lectures = [
      {
        title: 'Robotics Fundamentals & Orientation',
        description: 'Introduction to robotics, basic concepts, components of a robot, and course overview',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Sample video
        fileType: 'video',
        topic: 'Introduction to Robotics',
        duration: '15m',
        order: 1,
      },
      {
        title: 'Understanding Sensors and Actuators',
        description: 'Deep dive into various types of sensors and actuators used in robotics',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileType: 'video',
        topic: 'Introduction to Robotics',
        duration: '20m',
        order: 2,
      },
      {
        title: 'Robot Programming Basics',
        description: 'Introduction to programming robots using Python and basic algorithms',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileType: 'video',
        topic: 'Introduction to Robotics',
        duration: '25m',
        order: 3,
      },
    ];

    const module1Resources = [];
    for (const lecture of module1Lectures) {
      const resource = await Resource.create({
        ...lecture,
        courseId: course._id,
        uploadedBy: user._id,
        isPublic: true,
      });
      module1Resources.push(resource._id);
      console.log(`  ✅ Created: ${lecture.title}`);
    }

    const module1 = await Module.create({
      title: 'Introduction to Robotics',
      description: 'Learn the fundamentals of robotics, components, and programming basics',
      courseId: course._id,
      order: 1,
      resources: module1Resources,
      isFree: false,
      videoCount: module1Resources.length,
    });
    console.log(`✅ Module 1 created with ${module1Resources.length} lectures\n`);

    // Module 2: AI in Robotics
    console.log('📦 Creating Module 2: AI in Robotics...');
    
    const module2Lectures = [
      {
        title: 'Introduction to Artificial Intelligence',
        description: 'What is AI, machine learning basics, and applications in robotics',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileType: 'video',
        topic: 'AI in Robotics',
        duration: '30m',
        order: 1,
      },
      {
        title: 'Computer Vision for Robots',
        description: 'How robots see and interpret the world using cameras and AI',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileType: 'video',
        topic: 'AI in Robotics',
        duration: '35m',
        order: 2,
      },
    ];

    const module2Resources = [];
    for (const lecture of module2Lectures) {
      const resource = await Resource.create({
        ...lecture,
        courseId: course._id,
        uploadedBy: user._id,
        isPublic: true,
      });
      module2Resources.push(resource._id);
      console.log(`  ✅ Created: ${lecture.title}`);
    }

    const module2 = await Module.create({
      title: 'AI in Robotics',
      description: 'Explore artificial intelligence applications in modern robotics',
      courseId: course._id,
      order: 2,
      resources: module2Resources,
      isFree: false,
      videoCount: module2Resources.length,
    });
    console.log(`✅ Module 2 created with ${module2Resources.length} lectures\n`);

    // Module 3: Hands-on Projects
    console.log('📦 Creating Module 3: Hands-on Projects...');
    
    const module3Lectures = [
      {
        title: 'Building Your First Robot',
        description: 'Step-by-step guide to building a simple line-following robot',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileType: 'video',
        topic: 'Hands-on Projects',
        duration: '45m',
        order: 1,
      },
      {
        title: 'Advanced Project: Autonomous Navigation',
        description: 'Create a robot that can navigate autonomously using sensors',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileType: 'video',
        topic: 'Hands-on Projects',
        duration: '50m',
        order: 2,
      },
    ];

    const module3Resources = [];
    for (const lecture of module3Lectures) {
      const resource = await Resource.create({
        ...lecture,
        courseId: course._id,
        uploadedBy: user._id,
        isPublic: true,
      });
      module3Resources.push(resource._id);
      console.log(`  ✅ Created: ${lecture.title}`);
    }

    const module3 = await Module.create({
      title: 'Hands-on Projects',
      description: 'Build real robots and apply your knowledge in practical projects',
      courseId: course._id,
      order: 3,
      resources: module3Resources,
      isFree: false,
      videoCount: module3Resources.length,
    });
    console.log(`✅ Module 3 created with ${module3Resources.length} lectures\n`);

    // Summary
    console.log('═'.repeat(70));
    console.log('✅ ROBOTICS COURSE STRUCTURE CREATED!\n');
    console.log(`📚 Course: ${course.title}`);
    console.log(`   Course ID: ${course._id}\n`);
    console.log('📦 Modules Created:\n');
    console.log(`   1. ${module1.title} (${module1Resources.length} lectures)`);
    console.log(`      Module ID: ${module1._id}`);
    console.log(`      First Lecture ID: ${module1Resources[0]}\n`);
    console.log(`   2. ${module2.title} (${module2Resources.length} lectures)`);
    console.log(`      Module ID: ${module2._id}\n`);
    console.log(`   3. ${module3.title} (${module3Resources.length} lectures)`);
    console.log(`      Module ID: ${module3._id}\n`);
    console.log(`📊 Total: 3 modules, ${module1Resources.length + module2Resources.length + module3Resources.length} lectures`);
    console.log('═'.repeat(70));
    console.log('\n✅ Now run: node createRoboticsQuiz.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  }
}

seedModules();
