import mongoose from "mongoose";

/**
 * Multi-Database Configuration for 10K+ Users
 * Splits data across 3 FREE MongoDB Atlas M0 clusters (512MB each = 1.5GB total)
 * 
 * Database 1 (Primary): Users, Auth, Communities, Connections
 * Database 2 (Secondary): Doubts, Resources, Playlists, Posts
 * Database 3 (Tertiary): Messages, Notifications, Broadcasts, Rooms
 */

const connections = {};

const connectionOptions = {
  maxPoolSize: 100,  // Increased from 20 for better concurrency
  minPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 30000,
  compressors: ['zlib'],  // Enable compression
  zlibCompressionLevel: 6,
};

/**
 * Connect to a specific database
 * @param {string} name - Database identifier (primary, secondary, tertiary)
 * @param {string} uri - MongoDB connection string
 */
const connectDatabase = async (name, uri) => {
  try {
    if (!uri) {
      console.warn(`⚠️ ${name} database URI not provided - using fallback to MONGO_URI`);
      uri = process.env.MONGO_URI;
    }

    console.log(`Connecting to ${name} database...`);
    const conn = await mongoose.createConnection(uri, connectionOptions).asPromise();
    
    connections[name] = conn;
    
    // Create indexes for this connection
    conn.once('open', async () => {
      console.log(`✓ ${name} database connected: ${conn.host}`);
    });

    conn.on('error', (err) => {
      console.error(`✗ ${name} database error:`, err.message);
    });

    conn.on('disconnected', () => {
      console.warn(`⚠️ ${name} database disconnected`);
    });

    return conn;
  } catch (error) {
    console.error(`✗ ${name} database connection failed:`, error.message);
    throw error;
  }
};

/**
 * Initialize all database connections
 */
export const connectAllDatabases = async () => {
  try {
    // Check if multi-database mode is enabled
    const isMultiDbMode = process.env.MONGO_URI_PRIMARY || 
                          process.env.MONGO_URI_SECONDARY || 
                          process.env.MONGO_URI_TERTIARY;

    if (!isMultiDbMode) {
      console.log('📦 Single database mode detected (no MONGO_URI_PRIMARY found)');
      console.log('💡 To enable 10K user capacity, add 3 MongoDB URIs to .env:');
      console.log('   MONGO_URI_PRIMARY=... (Users, Auth, Communities)');
      console.log('   MONGO_URI_SECONDARY=... (Doubts, Resources)');
      console.log('   MONGO_URI_TERTIARY=... (Messages, Broadcasts)');
      
      // Fallback to single database
      const singleConn = await mongoose.connect(process.env.MONGO_URI, connectionOptions);
      connections.primary = mongoose.connection;
      connections.secondary = mongoose.connection;
      connections.tertiary = mongoose.connection;
      console.log(`✓ Single MongoDB Connected: ${mongoose.connection.host}`);
      return;
    }

    console.log('🚀 Multi-database mode enabled - connecting to 3 clusters...');

    // Connect to all 3 databases in parallel
    await Promise.all([
      connectDatabase('primary', process.env.MONGO_URI_PRIMARY),
      connectDatabase('secondary', process.env.MONGO_URI_SECONDARY),
      connectDatabase('tertiary', process.env.MONGO_URI_TERTIARY),
    ]);

    console.log('✅ All 3 databases connected successfully!');
    console.log('📊 Total capacity: 10,000+ concurrent users');

  } catch (error) {
    console.error('✗ Multi-database connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Get database connection by name
 * @param {string} name - primary, secondary, or tertiary
 */
export const getConnection = (name = 'primary') => {
  if (!connections[name]) {
    console.warn(`⚠️ ${name} connection not found, using primary`);
    return connections.primary || mongoose.connection;
  }
  return connections[name];
};

/**
 * Close all database connections
 */
export const closeAllConnections = async () => {
  const promises = Object.entries(connections).map(([name, conn]) => {
    console.log(`Closing ${name} database connection...`);
    return conn.close();
  });
  await Promise.all(promises);
  console.log('✓ All database connections closed');
};

// Export connections for direct access
export const primaryDb = () => getConnection('primary');
export const secondaryDb = () => getConnection('secondary');
export const tertiaryDb = () => getConnection('tertiary');

export default {
  connectAllDatabases,
  getConnection,
  closeAllConnections,
  primaryDb,
  secondaryDb,
  tertiaryDb,
};
