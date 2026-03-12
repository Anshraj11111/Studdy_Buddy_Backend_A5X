import authService from '../services/auth.service.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, role, skills } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide name, email, and password',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Register user
    const user = await authService.register({
      name,
      email,
      password,
      role,
      skills,
    });

    // Generate token
    const token = authService.generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        success: false,
        error: {
          message: error.message,
          code: 'EMAIL_EXISTS',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Registration failed',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide email and password',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Login user
    const { user, token } = await authService.login(email, password);

    res.status(200).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Login failed',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
export const getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await authService.getUserById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch profile',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, skills, profileImage } = req.body;

    const user = await authService.updateProfile(req.user._id, {
      name,
      skills,
      profileImage,
    });

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'USER_NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update profile',
        code: 'SERVER_ERROR',
      },
    });
  }
};

export default {
  register,
  login,
  getProfile,
  updateProfile,
};
