import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.js';
import Module from './src/models/Module.js';
import Resource from './src/models/Resource.js';
import User from './src/models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URI_PRIMARY);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedCourses = async () => {
  try {
    console.log('🌱 Starting course seeding...');

    // Find a mentor user (or use first user)
    let mentor = await User.findOne({ role: 'mentor' });
    if (!mentor) {
      mentor = await User.findOne();
      if (!mentor) {
        console.error('❌ No users found in database. Please create a user first.');
        process.exit(1);
      }
    }

    console.log('👤 Using mentor:', mentor.name);

    // Sample courses data
    const coursesData = [
      {
        title: 'Complete ROS Mastery - Beginner to Advanced',
        description: 'Master Robot Operating System from scratch. Learn ROS concepts, navigation, SLAM, and build real-world robots.',
        thumbnail: '',
        topic: 'Robotics',
        difficulty: 'Beginner',
        language: 'English',
        isPremium: true,
        price: 499,
        rating: 4.8,
        reviewCount: 1234,
        enrolledCount: 2456,
        totalDuration: '24 hours',
        totalVideos: 45,
        tags: ['ROS', 'Robotics', 'Navigation', 'SLAM'],
        isTrending: true,
        isBestseller: true,
        createdBy: mentor._id,
        modules: []
      },
      {
        title: 'Python Programming - Complete Bootcamp',
        description: 'Learn Python from basics to advanced. Master OOP, data structures, algorithms and build real projects.',
        thumbnail: '',
        topic: 'Programming',
        difficulty: 'Beginner',
        language: 'English',
        isPremium: false,
        price: 0,
        rating: 4.9,
        reviewCount: 3456,
        enrolledCount: 8920,
        totalDuration: '18 hours',
        totalVideos: 32,
        tags: ['Python', 'Programming', 'OOP', 'Data Structures'],
        isTrending: true,
        isBestseller: false,
        createdBy: mentor._id,
        modules: []
      },
      {
        title: 'Machine Learning & AI Foundation',
        description: 'Comprehensive ML course covering supervised, unsupervised learning, neural networks and deep learning basics.',
        thumbnail: '',
        topic: 'AI/ML',
        difficulty: 'Intermediate',
        language: 'English',
        isPremium: true,
        price: 999,
        rating: 4.7,
        reviewCount: 892,
        enrolledCount: 1567,
        totalDuration: '32 hours',
        totalVideos: 56,
        tags: ['Machine Learning', 'AI', 'Neural Networks', 'Deep Learning'],
        isTrending: false,
        isBestseller: true,
        createdBy: mentor._id,
        modules: []
      },
      {
        title: 'IoT Development with Arduino & ESP32',
        description: 'Build smart IoT projects with Arduino and ESP32. Learn sensors, actuators, WiFi, MQTT and cloud integration.',
        thumbnail: '',
        topic: 'IoT',
        difficulty: 'Beginner',
        language: 'Hinglish',
        isPremium: true,
        price: 399,
        rating: 4.6,
        reviewCount: 567,
        enrolledCount: 1234,
        totalDuration: '16 hours',
        totalVideos: 28,
        tags: ['IoT', 'Arduino', 'ESP32', 'Sensors'],
        isTrending: true,
        isBestseller: false,
        createdBy: mentor._id,
        modules: []
      },
      {
        title: 'Complete Web Development - MERN Stack',
        description: 'Full stack web development with MongoDB, Express, React and Node.js. Build production-ready applications.',
        thumbnail: '',
        topic: 'Programming',
        difficulty: 'Intermediate',
        language: 'English',
        isPremium: true,
        price: 799,
        rating: 4.8,
        reviewCount: 2341,
        enrolledCount: 4567,
        totalDuration: '40 hours',
        totalVideos: 72,
        tags: ['Web Development', 'MERN', 'React', 'Node.js'],
        isTrending: true,
        isBestseller: true,
        createdBy: mentor._id,
        modules: []
      },
      {
        title: 'Startup & Entrepreneurship Essentials',
        description: 'Learn how to start and grow your startup. Covers ideation, MVP, funding, marketing and scaling strategies.',
        thumbnail: '',
        topic: 'Entrepreneurship',
        difficulty: 'Beginner',
        language: 'Hindi',
        isPremium: false,
        price: 0,
        rating: 4.5,
        reviewCount: 678,
        enrolledCount: 3421,
        totalDuration: '12 hours',
        totalVideos: 24,
        tags: ['Startup', 'Business', 'Entrepreneurship', 'Marketing'],
        isTrending: false,
        isBestseller: false,
        createdBy: mentor._id,
        modules: []
      }
    ];

    // Clear existing courses, modules, and update resources
    await Course.deleteMany({});
    await Module.deleteMany({});
    console.log('🧹 Cleared existing courses and modules');

    // Create courses
    const createdCourses = await Course.insertMany(coursesData);
    console.log(`✅ Created ${createdCourses.length} courses`);

    // Create sample modules for first course (ROS)
    const rosCourse = createdCourses[0];
    const rosModules = [
      {
        courseId: rosCourse._id,
        title: 'Introduction to ROS',
        description: 'Learn ROS basics, installation, and fundamental concepts',
        order: 1,
        isFree: true,
        duration: '2.5 hours',
        videoCount: 6,
        resources: [],
      },
      {
        courseId: rosCourse._id,
        title: 'ROS Navigation Stack',
        description: 'Master autonomous navigation, path planning, and obstacle avoidance',
        order: 2,
        isFree: false,
        duration: '4 hours',
        videoCount: 8,
        resources: [],
      },
      {
        courseId: rosCourse._id,
        title: 'SLAM & Mapping',
        description: 'Learn Simultaneous Localization and Mapping techniques',
        order: 3,
        isFree: false,
        duration: '5 hours',
        videoCount: 10,
        resources: [],
      }
    ];

    const createdModules = await Module.insertMany(rosModules);
    console.log(`✅ Created ${createdModules.length} modules for ROS course`);

    // Update ROS course with module IDs
    rosCourse.modules = createdModules.map(m => m._id);
    await rosCourse.save();

    console.log('🎉 Course seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${createdCourses.length} courses created`);
    console.log(`   - ${createdModules.length} modules created`);
    console.log(`   - Mentor: ${mentor.name} (${mentor.email})`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

connectDB().then(seedCourses);
