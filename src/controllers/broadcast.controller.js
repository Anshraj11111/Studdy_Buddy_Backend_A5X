import BroadcastEnrollment from '../models/BroadcastEnrollment.js';
import BroadcastJoinRequest from '../models/BroadcastJoinRequest.js';
import BroadcastMessage from '../models/BroadcastMessage.js';
import BroadcastCode from '../models/BroadcastCode.js';

const VALID_CHANNELS = ['robotics', 'aiml', 'electronics', 'renewable_energy'];

// ── Leave current channel ─────────────────────────────────────────────────────
export const leaveChannel = async (req, res) => {
  try {
    const userId = req.user._id;
    const { channel } = req.body; // Optional - leave specific channel
    
    console.log('User', userId, 'attempting to leave channel:', channel || 'any');

    let query = { user: userId };
    if (channel) {
      // Leave specific channel
      query.channel = channel;
    }

    // Find and remove enrollment(s)
    const deletedEnrollments = await BroadcastEnrollment.deleteMany(query);
    
    if (deletedEnrollments.deletedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: channel ? `Not enrolled in ${channel} channel` : 'Not enrolled in any channel' 
      });
    }

    // Also cancel any pending requests for this user (if leaving specific channel)
    if (channel) {
      await BroadcastJoinRequest.updateMany(
        { user: userId, requestedChannel: channel, status: 'pending' },
        { status: 'cancelled' }
      );
    } else {
      // Cancel all pending requests if leaving all channels
      await BroadcastJoinRequest.updateMany(
        { user: userId, status: 'pending' },
        { status: 'cancelled' }
      );
    }

    console.log('User', userId, 'left', deletedEnrollments.deletedCount, 'channel(s)');

    return res.json({ 
      success: true, 
      message: channel 
        ? `Successfully left ${channel} channel`
        : `Successfully left ${deletedEnrollments.deletedCount} channel(s)`,
      deletedCount: deletedEnrollments.deletedCount
    });
  } catch (err) {
    console.error('Leave channel error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get my enrollment status ──────────────────────────────────────────────────
export const getMyStatus = async (req, res) => {
  try {
    const userId = req.user._id
    
    // Get ALL enrollments for this user (allow multiple channels)
    const enrollments = await BroadcastEnrollment.find({ user: userId });
    const pendingReq = await BroadcastJoinRequest.findOne({ user: userId, status: 'pending' });

    const responseData = {
      success: true,
      userId: userId, // Include user ID for frontend validation
      enrollments: enrollments.map(enrollment => ({
        channel: enrollment.channel, 
        school: enrollment.school, 
        class: enrollment.class, 
        joinedAt: enrollment.joinedAt,
        userId: enrollment.user // Include for verification
      })),
      // Keep backward compatibility
      enrollment: enrollments.length > 0 ? {
        channel: enrollments[0].channel, 
        school: enrollments[0].school, 
        class: enrollments[0].class, 
        joinedAt: enrollments[0].joinedAt,
        userId: enrollments[0].user
      } : null,
      pendingRequest: pendingReq
        ? { 
            channel: pendingReq.requestedChannel, 
            status: pendingReq.status,
            userId: pendingReq.user // Include for verification
          }
        : null,
    };
    
    return res.json(responseData);
  } catch (err) {
    console.error('getMyStatus error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Join a channel (first time — no existing enrollment) ──────────────────────
export const joinChannel = async (req, res) => {
  try {
    const { channel, school, class: cls, code } = req.body;
    
    if (!VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    }
    
    if (!school || !cls || !code) {
      return res.status(400).json({ success: false, message: 'School, class and code are required' });
    }

    // Verify code
    const validCode = await BroadcastCode.findOne({ channel, code: code.trim(), active: true });
    
    if (!validCode) {
      return res.status(400).json({ success: false, message: 'Invalid access code for this channel' });
    }

    // Check if already enrolled in THIS specific channel
    const existingInThisChannel = await BroadcastEnrollment.findOne({ 
      user: req.user._id, 
      channel: channel 
    });
    
    if (existingInThisChannel) {
      return res.status(400).json({ 
        success: false, 
        message: `Already enrolled in ${channel}`, 
        channel: channel 
      });
    }

    const enrollment = await BroadcastEnrollment.create({
      user: req.user._id, 
      channel: channel, // Use exact channel value
      school: school.trim(), 
      class: cls.trim(), 
      code: code.trim(),
    });

    // Verify the created enrollment has the correct channel
    if (enrollment.channel !== channel) {
      console.error('CRITICAL ERROR: Created enrollment has wrong channel! Requested:', channel, 'Created:', enrollment.channel);
      return res.status(500).json({ success: false, message: 'Database inconsistency detected' });
    }

    const responseEnrollment = {
      channel: enrollment.channel,
      school: enrollment.school,
      class: enrollment.class,
      joinedAt: enrollment.joinedAt,
      userId: enrollment.user
    };

    return res.json({ 
      success: true, 
      enrollment: responseEnrollment
    });
  } catch (err) {
    console.error('joinChannel error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Request to join an additional channel ─────────────────────────────────────
export const requestJoin = async (req, res) => {
  try {
    const { channel } = req.body; // Only need channel, other details from existing enrollment
    console.log('Request join attempt:', { userId: req.user._id, channel });
    
    if (!VALID_CHANNELS.includes(channel))
      return res.status(400).json({ success: false, message: 'Invalid channel' });

    // Check if already enrolled in this specific channel
    const alreadyInThisChannel = await BroadcastEnrollment.findOne({ 
      user: req.user._id, 
      channel: channel 
    });
    if (alreadyInThisChannel)
      return res.status(400).json({ success: false, message: 'Already enrolled in this channel' });

    // Get any existing enrollment to use its data
    const existingEnrollment = await BroadcastEnrollment.findOne({ user: req.user._id });
    if (!existingEnrollment)
      return res.status(400).json({ success: false, message: 'No existing enrollment found. Please join a channel first.' });

    // Check for existing pending request for this channel
    const existingPendingForChannel = await BroadcastJoinRequest.findOne({ 
      user: req.user._id, 
      requestedChannel: channel,
      status: 'pending' 
    });
    if (existingPendingForChannel)
      return res.status(400).json({ success: false, message: `Already have pending request for ${channel} channel` });

    // Cancel any other pending requests for this user (only allow one pending at a time)
    await BroadcastJoinRequest.updateMany(
      { user: req.user._id, status: 'pending' },
      { status: 'cancelled' }
    );

    // Use existing enrollment details for the request
    const request = await BroadcastJoinRequest.create({
      user: req.user._id,
      currentChannel: existingEnrollment.channel,
      requestedChannel: channel,
      school: existingEnrollment.school,        // Use existing school
      class: existingEnrollment.class,          // Use existing class  
      code: existingEnrollment.code,            // Use existing code
    });

    console.log('Join request created:', request._id);

    // Notify admin via socket
    try {
      const io = req.app.get('io');
      if (io) io.emit('broadcastJoinRequest', { requestId: request._id, userId: req.user._id, requestedChannel: channel });
    } catch (_) {}

    return res.json({ success: true, request });
  } catch (err) {
    console.error('Request join error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get messages for enrolled channel ─────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const enrollment = await BroadcastEnrollment.findOne({ user: req.user._id });
    if (!enrollment)
      return res.status(403).json({ success: false, message: 'Not enrolled in any channel' });

    const messages = await BroadcastMessage.find({ channel: enrollment.channel, deleted: false })
      .populate('sender', 'name profileImage role')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    return res.json({ success: true, messages: messages.reverse(), channel: enrollment.channel });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete a message (mentor/admin) ───────────────────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const msg = await BroadcastMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' });
    const isOwner = String(msg.sender) === String(req.user._id) ||
                    (msg.sender?._id && String(msg.sender._id) === String(req.user._id));
    if (req.user.role !== 'mentor' && !isOwner)
      return res.status(403).json({ success: false, message: 'Not allowed' });
    msg.deleted = true;
    await msg.save();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════ ADMIN ENDPOINTS ══════════════════════════════════════════

// ── Add / manage access codes ──────────────────────────────────────────────────
export const addCode = async (req, res) => {
  try {
    const { channel, code } = req.body;
    if (!VALID_CHANNELS.includes(channel))
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    if (!code?.trim())
      return res.status(400).json({ success: false, message: 'Code is required' });
    const doc = await BroadcastCode.findOneAndUpdate(
      { channel, code: code.trim() },
      { channel, code: code.trim(), active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getCodes = async (req, res) => {
  try {
    const codes = await BroadcastCode.find().sort({ channel: 1, createdAt: -1 });
    return res.json({ success: true, codes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCode = async (req, res) => {
  try {
    const { channel, code } = req.body;
    if (!VALID_CHANNELS.includes(channel))
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    if (!code?.trim())
      return res.status(400).json({ success: false, message: 'Code is required' });

    // Update or create code for this channel (only one code per channel)
    const doc = await BroadcastCode.findOneAndUpdate(
      { channel },
      { channel, code: code.trim(), active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    return res.json({ success: true, doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCode = async (req, res) => {
  try {
    await BroadcastCode.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get pending join requests ──────────────────────────────────────────────────
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await BroadcastJoinRequest.find({ status: 'pending' })
      .populate('user', 'name email profileImage')
      .sort({ createdAt: -1 });
    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Accept join request ────────────────────────────────────────────────────────
export const acceptRequest = async (req, res) => {
  try {
    const request = await BroadcastJoinRequest.findById(req.params.id).populate('user', 'name _id');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Request already resolved' });

    // Check if user is already enrolled in the requested channel
    const existingInChannel = await BroadcastEnrollment.findOne({
      user: request.user._id,
      channel: request.requestedChannel
    });

    if (existingInChannel) {
      console.log('User already enrolled in channel:', request.requestedChannel);
      // Just mark request as accepted since user is already enrolled
      request.status = 'accepted';
      await request.save();
      return res.json({ 
        success: true, 
        message: 'User already enrolled in this channel',
        enrollment: existingInChannel 
      });
    }

    // Create NEW enrollment (don't replace existing ones)
    let newEnrollment;
    try {
      newEnrollment = await BroadcastEnrollment.create({
        user: request.user._id,
        channel: request.requestedChannel,
        school: request.school,
        class: request.class,
        code: request.code,
        joinedAt: new Date(),
      });
      
      console.log('New enrollment created:', newEnrollment._id, 'for channel:', request.requestedChannel);
    } catch (enrollmentError) {
      // Handle duplicate key error specifically
      if (enrollmentError.code === 11000) {
        console.log('Duplicate enrollment detected, checking existing...');
        
        // Find the existing enrollment
        const existingEnrollment = await BroadcastEnrollment.findOne({
          user: request.user._id,
          channel: request.requestedChannel
        });
        
        if (existingEnrollment) {
          console.log('Using existing enrollment:', existingEnrollment._id);
          newEnrollment = existingEnrollment;
        } else {
          throw new Error('Duplicate key error but no existing enrollment found');
        }
      } else {
        throw enrollmentError; // Re-throw if it's not a duplicate key error
      }
    }

    request.status = 'accepted';
    await request.save();

    // Notify student via socket
    try {
      const io = req.app.get('io');
      if (io) io.to(`user:${request.user._id}`).emit('broadcastRequestResolved', {
        status: 'accepted', 
        channel: request.requestedChannel,
        enrollment: {
          channel: newEnrollment.channel,
          school: newEnrollment.school,
          class: newEnrollment.class,
          joinedAt: newEnrollment.joinedAt
        }
      });
    } catch (_) {}

    return res.json({ success: true, enrollment: newEnrollment });
  } catch (err) {
    console.error('Accept request error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Reject join request ────────────────────────────────────────────────────────
export const rejectRequest = async (req, res) => {
  try {
    const request = await BroadcastJoinRequest.findById(req.params.id).populate('user', '_id');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = 'rejected';
    await request.save();

    try {
      const io = req.app.get('io');
      if (io) io.to(`user:${request.user._id}`).emit('broadcastRequestResolved', {
        status: 'rejected', channel: request.requestedChannel,
      });
    } catch (_) {}

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get enrolled members per channel (mentor view) ────────────────────────────
export const getChannelMembers = async (req, res) => {
  try {
    const { channel } = req.params;
    if (!VALID_CHANNELS.includes(channel))
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    const members = await BroadcastEnrollment.find({ channel })
      .populate('user', 'name email profileImage role')
      .sort({ joinedAt: -1 });
    return res.json({ success: true, members });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get all enrollments (admin view) ──────────────────────────────────────────
export const getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await BroadcastEnrollment.find()
      .populate('user', 'name email profileImage')
      .sort({ createdAt: -1 });

    // Group by channel
    const channelStats = {};
    VALID_CHANNELS.forEach(channel => {
      channelStats[channel] = {
        count: 0,
        members: []
      };
    });

    enrollments.forEach(enrollment => {
      if (channelStats[enrollment.channel]) {
        channelStats[enrollment.channel].count++;
        channelStats[enrollment.channel].members.push({
          id: enrollment._id,
          user: enrollment.user,
          school: enrollment.school,
          class: enrollment.class,
          joinedAt: enrollment.joinedAt
        });
      }
    });

    return res.json({ 
      success: true, 
      channelStats,
      totalEnrollments: enrollments.length
    });
  } catch (err) {
    console.error('getAllEnrollments error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
