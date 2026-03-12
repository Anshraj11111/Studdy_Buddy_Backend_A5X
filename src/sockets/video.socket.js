export const setupVideoSocket = (io) => {
  io.on('connection', (socket) => {
    // WebRTC offer event
    socket.on('offer', (data) => {
      try {
        const { roomId, offer, fromUserId, toUserId } = data;

        // Relay offer to the other user
        socket.to(roomId).emit('offer', {
          offer,
          fromUserId,
          toUserId,
        });
      } catch (error) {
        console.error('Error sending offer:', error);
        socket.emit('error', { message: 'Failed to send offer' });
      }
    });

    // WebRTC answer event
    socket.on('answer', (data) => {
      try {
        const { roomId, answer, fromUserId, toUserId } = data;

        // Relay answer to the other user
        socket.to(roomId).emit('answer', {
          answer,
          fromUserId,
          toUserId,
        });
      } catch (error) {
        console.error('Error sending answer:', error);
        socket.emit('error', { message: 'Failed to send answer' });
      }
    });

    // ICE candidate event
    socket.on('iceCandidate', (data) => {
      try {
        const { roomId, candidate, fromUserId, toUserId } = data;

        // Relay ICE candidate to the other user
        socket.to(roomId).emit('iceCandidate', {
          candidate,
          fromUserId,
          toUserId,
        });
      } catch (error) {
        console.error('Error sending ICE candidate:', error);
        socket.emit('error', { message: 'Failed to send ICE candidate' });
      }
    });

    // Video call initiated event
    socket.on('initiateCall', async (data) => {
      try {
        const { roomId, fromUserId, toUserId } = data;

        console.log('📞 Initiating call:', { roomId, fromUserId, toUserId });

        // Fetch caller information from database using ES module import
        const { default: User } = await import('../models/User.js');
        const caller = await User.findById(fromUserId).select('name email avatar');

        console.log('📞 Caller info:', caller);

        const callData = {
          roomId,
          fromUserId,
          toUserId,
          caller: {
            _id: caller._id,
            name: caller.name,
            email: caller.email,
            avatar: caller.avatar,
          },
        };

        // Emit to the specific user's personal room (user:userId)
        console.log(`📞 Emitting incomingCall to user:${toUserId}`);
        io.to(`user:${toUserId}`).emit('incomingCall', callData);
        console.log(`📞 Emitted incomingCall to user:${toUserId}`);
        
        // Also check if the user is in any socket rooms
        const sockets = await io.in(`user:${toUserId}`).fetchSockets();
        console.log(`📞 Found ${sockets.length} sockets in user:${toUserId} room`);
        sockets.forEach(s => {
          console.log(`  - Socket ${s.id} in rooms:`, Array.from(s.rooms));
        });
      } catch (error) {
        console.error('Error initiating call:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    // Call accepted event
    socket.on('callAccepted', (data) => {
      try {
        const { roomId, fromUserId, toUserId } = data;

        // Notify the caller that call was accepted
        socket.to(roomId).emit('callAccepted', {
          fromUserId,
          toUserId,
        });
      } catch (error) {
        console.error('Error accepting call:', error);
        socket.emit('error', { message: 'Failed to accept call' });
      }
    });

    // Call rejected event
    socket.on('callRejected', (data) => {
      try {
        const { roomId, fromUserId, toUserId } = data;

        // Notify the caller that call was rejected
        socket.to(roomId).emit('callRejected', {
          fromUserId,
          toUserId,
        });
      } catch (error) {
        console.error('Error rejecting call:', error);
        socket.emit('error', { message: 'Failed to reject call' });
      }
    });

    // Call ended event
    socket.on('callEnded', (data) => {
      try {
        const { roomId, fromUserId, toUserId } = data;

        // Notify the other user that call ended
        socket.to(roomId).emit('callEnded', {
          fromUserId,
          toUserId,
        });
      } catch (error) {
        console.error('Error ending call:', error);
        socket.emit('error', { message: 'Failed to end call' });
      }
    });

    // Screen sharing started event
    socket.on('screenShareStarted', (data) => {
      try {
        const { roomId, fromUserId, toUserId } = data;

        console.log('🖥️ Screen sharing started:', { roomId, fromUserId, toUserId });

        // Notify the other user via chat room only (both users are in the room during call)
        socket.to(roomId).emit('screenShareStarted', {
          fromUserId,
          toUserId,
        });
      } catch (error) {
        console.error('Error notifying screen share start:', error);
        socket.emit('error', { message: 'Failed to notify screen share start' });
      }
    });

    // Screen sharing stopped event
    socket.on('screenShareStopped', (data) => {
      try {
        const { roomId, fromUserId, toUserId } = data;

        console.log('🖥️ Screen sharing stopped:', { roomId, fromUserId, toUserId });

        // Notify the other user via chat room only (both users are in the room during call)
        socket.to(roomId).emit('screenShareStopped', {
          fromUserId,
          toUserId,
        });
      } catch (error) {
        console.error('Error notifying screen share stop:', error);
        socket.emit('error', { message: 'Failed to notify screen share stop' });
      }
    });
  });
};

export default setupVideoSocket;
