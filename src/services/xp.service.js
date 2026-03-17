import User from '../models/User.js';

// XP thresholds
export const XP_LEVELS = [
  { name: 'Beginner', min: 0, max: 99 },
  { name: 'Intermediate', min: 100, max: 299 },
  { name: 'Expert', min: 300, max: 699 },
  { name: 'Master', min: 700, max: Infinity },
];

export const getLevel = (xp) => {
  return XP_LEVELS.find(l => xp >= l.min && xp <= l.max) || XP_LEVELS[0];
};

/**
 * Add XP to a user. Fire-and-forget  never throws.
 * @param {string} userId
 * @param {number} amount
 */
export const addXP = async (userId, amount) => {
  try {
    await User.findByIdAndUpdate(userId, { $inc: { xp: amount } });
  } catch (err) {
    console.error('XP update failed:', err.message);
  }
};

export default { addXP, getLevel, XP_LEVELS };
