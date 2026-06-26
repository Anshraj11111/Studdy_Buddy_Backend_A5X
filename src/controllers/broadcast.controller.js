import BroadcastEnrollment from '../models/BroadcastEnrollment.js';
import BroadcastJoinRequest from '../models/BroadcastJoinRequest.js';
import BroadcastMessage from '../models/BroadcastMessage.js';
import BroadcastCode from '../models/BroadcastCode.js';

const VALID_CHANNELS = ['robotics', 'aiml', 'electronics', 'renewable_energy'];

// ── Leave current channel ─────────────────────────────────────────────────────
export const leaveChannel = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('User', userId, 'attempting to leave channel');

    // Find and remove enrollment
    const enrollment = await BroadcastEnrollment.findOneAndDelete({ user: userId });
    
    if (!enrollment) {
      return res.status(400).json({ success: false, message: 'Not enrolled in any channel' });
    }

    // Also cancel any pending requests for this user
    await BroadcastJoinRequest.updateMany(
      { user: userId, status: 'pending' },
      { status: 'cancelled' }
    );

    console.log('User', userId, 'left channel:', enrollment.channel);

    return res.json({ 
      success: true, 
      message: `Successfully left ${enrollment.channel} channel`,
      leftChannel: enrollment.channel 
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
    
    const enrollment = await BroadcastEnrollment.findOne({ user: userId });
    const pendingReq = await BroadcastJoinRequest.findOne({ user: userId, status: 'pending' });

    const responseData = {
      success: true,
      userId: userId, // Include user ID for frontend validation
      enrollment: enrollment
        ? { 
            channel: enrollment.channel, 
            school: enrollment.school, 
            class: enrollment.class, 
            joinedAt: enrollment.joinedAt,
            userId: enrollment.user // Include for verification
          }
        : null,
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

    // Check existing enrollment
    const existing = await BroadcastEnrollment.findOne({ user: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: `Already enrolled in ${existing.channel}`, channel: existing.channel });
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

    const existing = await BroadcastEnrollment.findOne({ user: req.user._id });
    if (!existing)
      return res.status(400).json({ success: false, message: 'No existing enrollment found' });

    if (existing.channel === channel)
      return res.status(400).json({ success: false, message: 'Already in this channel' });

    // Check and cancel any existing pending request for this user
    const existingPending = await BroadcastJoinRequest.findOne({ user: req.user._id, status: 'pending' });
    if (existingPending) {
      // Cancel the existing pending request and create new one
      existingPending.status = 'cancelled';
      await existingPending.save();
    }

    // Use existing enrollment details for the request
    const request = await BroadcastJoinRequest.create({
      user: req.user._id,
      currentChannel: existing.channel,
      requestedChannel: channel,
      school: existing.school,        // Use existing school
      class: existing.class,          // Use existing class  
      code: existing.code,            // Use existing code
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

    // Update or create enrollment
    await BroadcastEnrollment.findOneAndUpdate(
      { user: request.user._id },
      {
        user: request.user._id,
        channel: request.requestedChannel,
        school: request.school,
        class: request.class,
        code: request.code,
        joinedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    request.status = 'accepted';
    await request.save();

    // Notify student via socket
    try {
      const io = req.app.get('io');
      if (io) io.to(`user:${request.user._id}`).emit('broadcastRequestResolved', {
        status: 'accepted', channel: request.requestedChannel,
      });
    } catch (_) {}

    return res.json({ success: true });
  } catch (err) {
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
