import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Added connection timeout
      family: 4, // Force IPv4 (some networks have IPv6 issues)
      retryWrites: true,
      w: 'majority',
    };

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`✓ MongoDB Connected: ${mongoose.connection.host}`);

  } catch (error) {
    console.error(`✗ MongoDB connection failed: ${error.message}`);
    console.error('Troubleshooting tips:');
    console.error('1. Check if IP whitelist includes 0.0.0.0/0 in MongoDB Atlas');
    console.error('2. Wait 2-3 minutes after adding IP to whitelist');
    console.error('3. Check your internet connection');
    console.error('4. Verify MongoDB URI in .env file');
    console.error('5. Check firewall/antivirus settings');
    process.exit(1);
  }
};

export default connectDB;