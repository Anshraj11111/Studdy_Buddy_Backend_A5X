/**
 * Cleanup Script: Remove test notifications
 * 
 * Usage: node cleanupTestNotifications.js
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function cleanup() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const dbUri = process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB\n');

    const Notification = (await import('./src/models/Notification.js')).default;

    console.log('🧹 Removing test doubt notifications...');
    const result = await Notification.deleteMany({
      type: 'doubt',
      message: { $regex: /^New doubt posted:/ },
    });

    console.log(`✅ Removed ${result.deletedCount} test notification(s)`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanup();
