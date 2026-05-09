import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 20,        // More connections for concurrent requests
      minPoolSize: 5,         // Keep minimum connections warm
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 8000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      // Performance optimizations
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000,
      compressors: 'zlib',    // Compress data transfer
    };

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, options);

    // Create indexes for faster auth queries
    mongoose.connection.once('open', async () => {
      try {
        const db = mongoose.connection.db;
        // Ensure email index exists for fast login lookups
        await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
        console.log('✓ DB indexes verified');
      } catch { /* indexes may already exist */ }
    });

    console.log(`✓ MongoDB Connected: ${mongoose.connection.host}`);

  } catch (error) {
    console.error(`✗ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;