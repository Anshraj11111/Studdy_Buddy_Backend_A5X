import MessageService from '../services/message.service.js';
import RoomService from '../services/room.service.js';
import logger from '../utils/logger.js';

const MAX_MESSAGE_LENGTH = 5000;
const MESSAGE_QUEUE_SIZE = 1000;

export const setupChatSocket = (io) => {
  // Track active connections
  const activeConnections = new Map();
  // Track user sockets by userId
  const userSockets = new Map();

  io.on('connection', (socket) => {
    logger.info('User connected', { socketId: socket.id });
    activeConnections.set(socket.id, { userId: null, roomId: null });

    // Store user socket mapping when they authenticate
    if (socket.handshake.auth && socket.handshake.auth.userId) {
      const userId = socket.handshake.auth.userId;
      socket.userId = userId;
      userSockets.set(userId, socket.id);
      // Join a personal room for this user
      socket.join(`user:${userId}`);
      console.log(`✅ User ${userId} joined personal room user:${userId} with socket ${socket.id}`);
      logger.info('User joined personal room', { userId, socketId: socket.id });
    } else {
      console.log(`⚠️ Socket ${socket.id} connected without userId in handshake.auth`);
    }

    // Join room event
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId, userId } = data;

        if (!roomId || !userId) {
          socket.emit('error', { message: 'Missing roomId or userId' });
          return;
        }

        // Store userId and join personal room if not already done
        if (!socket.userId) {
          socket.userId = userId;
          userSockets.set(userId, socket.id);
          socket.join(`user:${userId}`);
        }

        // Verify room exists
        const room = await RoomService.getRoomById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join socket to room
        socket.join(roomId);
        socket.roomId = roomId;

        // Update active connections
        activeConnections.set(socket.id, { userId, roomId });

        // Get latest messages (limit to 50 for performance)
        const messages = await MessageService.getLatestMessages(roomId, 50);

        // Emit join event to user
        socket.emit('roomJoined', {
          success: true,
          roomId,
          messages,
          participants: room.student1 && room.student2 ? 2 : 1,
        });

        // Notify others in room
        socket.to(roomId).emit('userJoined', {
          userId,
          message: 'A user joined the room',
        });

        logger.info('User joined room', { userId, roomId, socketId: socket.id });
      } catch (error) {
        logger.error('Error joining room', { error: error.message });
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Send message event
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, userId, content } = data;

        if (!socket.roomId || socket.roomId !== roomId) {
          socket.emit('error', { message: 'Not in this room' });
          return;
        }

        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        if (content.length > MAX_MESSAGE_LENGTH) {
          socket.emit('error', { message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
          return;
        }

        // Save message to database
        const message = await MessageService.saveMessage(userId, roomId, content);

        // Broadcast message to all users in room
        io.to(roomId).emit('messageReceived', {
          _id: message._id,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt,
          senderName: message.senderId.name,
          senderImage: message.senderId.profileImage,
        });

        logger.debug('Message sent', { userId, roomId, messageId: message._id });
      } catch (error) {
        logger.error('Error sending message', { error: error.message });
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    // Typing indicator event
    socket.on('typing', (data) => {
      const { roomId, userId, userName } = data;

      if (socket.roomId === roomId) {
        socket.to(roomId).emit('userTyping', {
          userId,
          userName,
        });
      }
    });

    // Stop typing event
    socket.on('stopTyping', (data) => {
      const { roomId, userId } = data;

      if (socket.roomId === roomId) {
        socket.to(roomId).emit('userStoppedTyping', {
          userId,
        });
      }
    });

    // Leave room event
    socket.on('leaveRoom', async (data) => {
      try {
        const { roomId } = data;

        socket.leave(roomId);
        socket.to(roomId).emit('userLeft', {
          message: 'A user left the room',
        });

        logger.info('User left room', { roomId, socketId: socket.id });
      } catch (error) {
        logger.error('Error leaving room', { error: error.message });
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      const connection = activeConnections.get(socket.id);
      if (connection && connection.roomId) {
        socket.to(connection.roomId).emit('userLeft', {
          message: 'A user disconnected',
        });
      }

      // Remove from user sockets map
      if (socket.userId) {
        userSockets.delete(socket.userId);
      }

      activeConnections.delete(socket.id);
      logger.info('User disconnected', { socketId: socket.id });
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('Socket error', { error: error.message, socketId: socket.id });
    });
  });

  // Make userSockets map available to other socket handlers
  io.userSockets = userSockets;

  // Periodic cleanup of stale connections
  setInterval(() => {
    const now = Date.now();
    activeConnections.forEach((connection, socketId) => {
      if (connection.lastActivity && now - connection.lastActivity > 30 * 60 * 1000) {
        // Remove connections inactive for 30 minutes
        activeConnections.delete(socketId);
      }
    });
  }, 5 * 60 * 1000); // Check every 5 minutes
};

export default setupChatSocket;
