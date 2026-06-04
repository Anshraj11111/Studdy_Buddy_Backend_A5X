import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['student', 'mentor'],
      default: 'student',
    },
    mentorCode: {
      type: String,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: '',
      maxlength: [300, 'Bio cannot exceed 300 characters'],
    },
    address: {
      type: String,
      default: '',
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    xp: {
      type: Number,
      default: 0,
      min: [0, 'XP cannot be negative'],
    },
    profileImage: {
      type: String,
      default: '',
    },
    bannerImage: {
      type: String,
      default: '',
    },
    headline: {
      type: String,
      default: '',
      maxlength: [120, 'Headline cannot exceed 120 characters'],
    },
    socialLinks: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      instagram: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    // Private fields — only visible to the owner, never exposed in public profile APIs
    phone: {
      type: String,
      default: '',
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    privateAddress: {
      type: String,
      default: '',
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    // Student: school / college info
    education: {
      institution: { type: String, default: '' },
      degree: { type: String, default: '' },
      field: { type: String, default: '' },
      startYear: { type: String, default: '' },
      endYear: { type: String, default: '' },
      description: { type: String, default: '', maxlength: [500, 'Description too long'] },
    },
    // Mentor: professional experience
    experience: {
      company: { type: String, default: '' },
      role: { type: String, default: '' },
      startYear: { type: String, default: '' },
      endYear: { type: String, default: '' },
      description: { type: String, default: '', maxlength: [500, 'Description too long'] },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to exclude password and private fields from JSON responses
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.phone;
  delete user.privateAddress;
  return user;
};

// Method to get full profile including private fields (for owner only)
userSchema.methods.toOwnerJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
