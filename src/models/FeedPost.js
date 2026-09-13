import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const feedPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 7000,
    },
    category: {
      type: String,
      enum: ['All', 'Robotics', 'IoT', 'Embedded Systems', 'AI/ML', 'Projects', 'Mentorship'],
      default: 'All',
      index: true,
    },
    mediaUrl: { type: String, default: null },   // base64 or URL
    mediaType: { type: String, enum: ['image', 'video', null], default: null },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

feedPostSchema.index({ category: 1, createdAt: -1 });
feedPostSchema.index({ userId: 1, createdAt: -1 });

// FeedPosts are stored in PRIMARY database (with User data)
let FeedPost;
try {
  const conn = getConnection('primary');
  FeedPost = conn.model('FeedPost', feedPostSchema);
} catch (error) {
  console.warn('⚠️ FeedPost model: Using default mongoose connection');
  FeedPost = mongoose.model('FeedPost', feedPostSchema);
}

export default FeedPost;
