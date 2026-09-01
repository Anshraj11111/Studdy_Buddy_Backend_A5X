#!/usr/bin/env node

/**
 * Resource Cleanup Script
 * Removes all existing resources from the database
 */

import mongoose from 'mongoose';
import Resource from './src/models/Resource.js';
import Module from './src/models/Module.js';
import CourseEnrollment from './src/models/CourseEnrollment.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function cleanupResources() {
  try {
    console.log('🧹 Starting resource cleanup...');

    // Get count of existing resources
    const resourceCount = await Resource.countDocuments();
    console.log(`📊 Found ${resourceCount} resources to delete`);

    if (resourceCount === 0) {
      console.log('✅ No resources found. Database is already clean.');
      return;
    }

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmDelete = await new Promise((resolve) => {
      readline.question(`⚠️  Are you sure you want to delete all ${resourceCount} resources? This action cannot be undone. (yes/no): `, (answer) => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });

    if (!confirmDelete) {
      console.log('❌ Operation cancelled by user.');
      return;
    }

    console.log('🗑️  Deleting resources...');

    // Step 1: Remove resource references from modules
    const moduleUpdateResult = await Module.updateMany(
      { resources: { $exists: true, $ne: [] } },
      { $set: { resources: [] } }
    );
    console.log(`📝 Updated ${moduleUpdateResult.modifiedCount} modules (cleared resource references)`);

    // Step 2: Remove resource references from course enrollments
    const enrollmentUpdateResult = await CourseEnrollment.updateMany(
      {
        $or: [
          { completedVideos: { $exists: true, $ne: [] } },
          { lastWatchedVideo: { $exists: true } }
        ]
      },
      {
        $set: { 
          completedVideos: [],
          lastWatchedVideo: null
        }
      }
    );
    console.log(`📚 Updated ${enrollmentUpdateResult.modifiedCount} course enrollments (cleared video references)`);

    // Step 3: Delete all resources
    const deleteResult = await Resource.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} resources`);

    // Step 4: Verify cleanup
    const remainingCount = await Resource.countDocuments();
    if (remainingCount === 0) {
      console.log('✅ Resource cleanup completed successfully!');
      console.log('📊 Database statistics:');
      console.log(`   - Resources deleted: ${deleteResult.deletedCount}`);
      console.log(`   - Modules updated: ${moduleUpdateResult.modifiedCount}`);
      console.log(`   - Enrollments updated: ${enrollmentUpdateResult.modifiedCount}`);
    } else {
      console.log(`⚠️  Cleanup incomplete. ${remainingCount} resources still remain.`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await cleanupResources();
    console.log('🎉 Cleanup script completed successfully!');
  } catch (error) {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}