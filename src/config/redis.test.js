import { createClient } from 'redis';
import { connectRedis, getRedisClient, disconnectRedis } from './redis.js';

// Mock redis
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('Redis Connection', () => {
  let mockRedisClient;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    mockRedisClient = {
      connect: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    };

    createClient.mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should connect to Redis successfully', async () => {
    mockRedisClient.connect.mockResolvedValueOnce();

    const client = await connectRedis();

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.any(String),
        socket: expect.objectContaining({
          reconnectStrategy: expect.any(Function),
          connectTimeout: 10000,
        }),
      })
    );
    expect(mockRedisClient.connect).toHaveBeenCalled();
    expect(client).toBe(mockRedisClient);
  });

  test('should handle connection failure gracefully', async () => {
    const mockError = new Error('Connection failed');
    mockRedisClient.connect.mockRejectedValueOnce(mockError);

    const client = await connectRedis();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Redis connection failed')
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Application will continue without Redis')
    );
    expect(client).toBeNull();
  });

  test('should register event handlers', async () => {
    mockRedisClient.connect.mockResolvedValueOnce();

    await connectRedis();

    expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('end', expect.any(Function));
  });

  test('should return redis client from getRedisClient', async () => {
    mockRedisClient.connect.mockResolvedValueOnce();
    await connectRedis();

    const client = getRedisClient();
    expect(client).toBe(mockRedisClient);
  });

  test('should disconnect redis client', async () => {
    mockRedisClient.connect.mockResolvedValueOnce();
    mockRedisClient.quit.mockResolvedValueOnce();

    await connectRedis();
    await disconnectRedis();

    expect(mockRedisClient.quit).toHaveBeenCalled();
  });

  test('should handle reconnection strategy', async () => {
    mockRedisClient.connect.mockResolvedValueOnce();

    await connectRedis();

    const createClientCall = createClient.mock.calls[0][0];
    const reconnectStrategy = createClientCall.socket.reconnectStrategy;

    // Test reconnection with retries < 10
    const delay1 = reconnectStrategy(1);
    expect(delay1).toBe(50);

    const delay5 = reconnectStrategy(5);
    expect(delay5).toBe(250);

    // Test reconnection with retries > 10
    const result = reconnectStrategy(11);
    expect(result).toBeInstanceOf(Error);
  });
});
