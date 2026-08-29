import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    courseName: {
      type: String,
      required: true,
    },
    courseId: {
      type: String,
      default: 'all-resources',
    },
    transactionId: {
      type: String,
      default: '',
    },
    upiId: {
      type: String,
      default: '',
    },
    paymentScreenshot: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ submittedAt: -1 });

// Lazy model creation
let Payment;

const getPaymentModel = () => {
  if (Payment) return Payment;
  
  try {
    const conn = getConnection('primary');
    if (conn && conn.readyState === 1) {
      Payment = conn.model('Payment', paymentSchema);
    } else {
      Payment = mongoose.model('Payment', paymentSchema);
    }
  } catch (error) {
    Payment = mongoose.model('Payment', paymentSchema);
  }
  
  return Payment;
};

export default getPaymentModel();
