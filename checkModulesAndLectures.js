/**
 * Check Modules and Lectures in Database
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function checkDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const Course = (await import('./src/models/Course.js')).default;
    const Module = (await import('./src/models/Module.js')).default;
    const Resource = (await import('./src/models/Resource.js')).default;

    // Find all courses
    console.log('📚 Checking Courses...');
    const courses = await Course.find().select('title description').lean();
    console.log(`Found ${courses.length} courses:\n`);
    courses.forEach((course, idx) => {
      console.log(`${idx + 1}. ${course.title}`);
      console.log(`   ID: ${course._id}\n`);
    });

    if (courses.length === 0) {
      console.log('❌ No courses found in database!');
      process.exit(0);
    }

    // Check each course for modules
    for (const course of courses) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📖 Course: ${course.title}`);
      console.log(`${'='.repeat(70)}\n`);

      const modules = await Module.find({ course: course._id })
        .sort({ order: 1, createdAt: 1 })
        .lean();

      console.log(`Found ${modules.length} modules in this course:\n`);

      if (modules.length === 0) {
        console.log('❌ No modules found for this course!');
        continue;
      }

      for (const [idx, module] of modules.entries()) {
        console.log(`  ${idx + 1}. ${module.title}`);
        console.log(`     Module ID: ${module._id}`);
        console.log(`     Order: ${module.order || 'N/A'}`);
        
        // Check resources in this module
        if (module.resources && module.resources.length > 0) {
          console.log(`     Resources (${module.resources.length}):`);
          
          for (const [rIdx, resourceId] of module.resources.entries()) {
            const resource = await Resource.findById(resourceId).select('title type').lean();
            if (resource) {
              console.log(`       ${rIdx + 1}. [${resource.type}] ${resource.title}`);
              console.log(`          Resource ID: ${resource._id}`);
            }
          }
        } else {
          console.log(`     ⚠️ No resources in this module`);
        }
        console.log();
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ Database check complete!');
    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
    process.exit(0);
  }
}

checkDatabase();
