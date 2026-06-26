import mongoose from 'mongoose';

// Tracks which channel a student is enrolled in
const broadcastEnrollmentSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, enum: ['robotics', 'aiml', 'electronics', 'renewable_energy'], required: true },
    school:  { type: String, required: true, trim: true },
    class:   { type: String, required: true, trim: true },
    code:    { type: String, required: true, trim: true }, // channel-specific access code
    joinedAt:{ type: Date, default: Date.now },
  },
  { timestamps: false }
);

// One student = one primary enrollment (unique per user)
broadcastEnrollmentSchema.index({ user: 1 }, { unique: true });

const BroadcastEnrollment = mongoose.model('BroadcastEnrollment', broadcastEnrollmentSchema);
export default BroadcastEnrollment;
