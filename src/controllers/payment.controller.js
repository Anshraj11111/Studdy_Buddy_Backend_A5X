import Payment from '../models/Payment.js';
import User from '../models/User.js';
import AppSettings from '../models/AppSettings.js';

/**
 * Submit payment for verification
 * POST /api/payments/submit
 */
export const submitPayment = async (req, res) => {
  try {
    const { amount, courseName, courseId, transactionId, upiId } = req.body;
    const userId = req.user._id;

    if (!amount || !courseName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Amount and course name are required', code: 'VALIDATION_ERROR' },
      });
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      userName: req.user.name,
      userEmail: req.user.email,
      amount,
      courseName,
      courseId: courseId || 'all-resources',
      transactionId: transactionId || '',
      upiId: upiId || '',
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      data: { payment },
      message: 'Payment submitted for verification. Admin will review shortly.',
    });
  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to submit payment', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get user's payment history
 * GET /api/payments/my-payments
 */
export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { payments },
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch payments', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get UPI ID for QR code generation
 * GET /api/payments/upi-settings
 */
export const getUpiSettings = async (req, res) => {
  try {
    // Get UPI ID from settings
    let setting = await AppSettings.findOne({ key: 'upi_id' });
    
    // If not found, create default
    if (!setting) {
      setting = await AppSettings.create({
        key: 'upi_id',
        value: '8269858259@upi',
        description: 'UPI ID for payment QR code',
      });
    }

    res.status(200).json({
      success: true,
      data: { upiId: setting.value },
    });
  } catch (error) {
    console.error('Get UPI settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch UPI settings', code: 'SERVER_ERROR' },
    });
  }
};

export default {
  submitPayment,
  getMyPayments,
  getUpiSettings,
};
