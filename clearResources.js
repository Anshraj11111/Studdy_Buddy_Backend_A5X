#!/usr/bin/env node

/**
 * Quick Resource Cleanup Script
 * Removes all existing resources from the database without confirmation
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

async function clearAllResources() {
  try {
    console.log('🧹 Clearing all resources from database...');

    // Get count before deletion
    const resourceCount = await Resource.countDocuments();
    console.log(`📊 Found ${resourceCount} resources`);

    if (resourceCount === 0) {
      console.log('✅ No resources found. Database is already clean.');
      return;
    }

    // Step 1: Clear resource references from modules
    await Module.updateMany(
      { resources: { $exists: true, $ne: [] } },
      { $set: { resources: [] } }
    );
    console.log('📝 Cleared resource references from modules');

    // Step 2: Clear resource references from course enrollments
    await CourseEnrollment.updateMany(
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
    console.log('📚 Cleared video references from enrollments');

    // Step 3: Delete all resources
    const deleteResult = await Resource.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} resources`);

    console.log('✅ All resources cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing resources:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await clearAllResources();
    console.log('🎉 Resource cleanup completed!');
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

main();