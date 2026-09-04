import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // The full PushSubscription object from browser
  endpoint: {
    type: String,
    required: true,
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  // Track device/browser for multi-device support
  userAgent: { type: String, default: '' },
}, { timestamps: true });

// One user can have multiple subscriptions (multiple devices/browsers)
pushSubscriptionSchema.index({ user: 1 });
// Unique per endpoint so we don't double-store same browser
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
