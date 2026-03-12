import mongoose from 'mongoose';
import connectDB from './db.js';

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    on: jest.fn(),
    host: 'test-host',
  },
}));

describe('MongoDB Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should connect to MongoDB successfully', async () => {
    mongoose.connect.mockResolvedValueOnce({
      connection: { host: 'test-host' },
    });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(
      process.env.MONGO_URI,
      expect.objectContaining({
        maxPoolSize: 10,
        minPoolSize: 5,
      })
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('MongoDB Connected')
    );
  });

  test('should handle connection failure and exit process', async () => {
    const mockError = new Error('Connection failed');
    mongoose.connect.mockRejectedValueOnce(mockError);

    // Mock process.exit
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    await connectDB();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('MongoDB connection failed')
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  test('should register connection event handlers', async () => {
    mongoose.connect.mockResolvedValueOnce({
      connection: { host: 'test-host' },
    });

    await connectDB();

    expect(mongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(mongoose.connection.on).toHaveBeenCalledWith('reconnected', expect.any(Function));
  });
});
