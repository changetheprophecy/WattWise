const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

const {
  getUsersCollection,
  getVerificationTokensCollection,
} = require('../config/db');
const {
  signAccessToken,
  createSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  hashToken,
} = require('../services/tokenService');
const {
  sendVerificationEmail,
} = require('../services/emailService');
const {
  requireAuth,
  requireVerifiedEmail,
} = require('../middleware/authMiddleware');
const {
  loginLimiter,
  registerLimiter,
  resendVerificationLimiter,
} = require('../middleware/rateLimiter');

const router = express.Router();

// Email format regular expression
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Registers a new user with email and password.
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, deviceInfo } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_NAME',
        message: 'Name must be at least 2 characters long.',
      });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        message: 'Please provide a valid email address.',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSWORD',
        message: 'Password must be at least 8 characters long.',
      });
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({
        success: false,
        code: 'WEAK_PASSWORD',
        message: 'Password must contain at least one letter and one number.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsersCollection();
    const verificationTokens = getVerificationTokensCollection();

    // 2. Check for duplicate account
    const existingUser = await users.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email address already exists.',
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      providers: ['local'],
      googleId: null,
      isEmailVerified: false,
      profile: {
        avatarUrl: null,
        phone: null,
      },
      preferences: {
        currency: 'BDT',
        currencySymbol: '৳',
        tariffRate: 8.63,
        monthlyBudget: 3000,
        dailyEnergyGoal: 10.0,
      },
      assignedDevice: null,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await users.insertOne(newUser);
    newUser._id = insertResult.insertedId;

    // 4. Generate email verification token (24-hour expiration)
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawVerificationToken);
    const verificationExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await verificationTokens.insertOne({
      tokenHash,
      userId: newUser._id,
      type: 'email_verification',
      createdAt: now,
      expiresAt: verificationExpiry,
    });

    // 5. Attempt dispatching verification email
    await sendVerificationEmail(normalizedEmail, newUser.name, rawVerificationToken);

    // 6. Establish session and generate tokens
    const session = await createSession({
      userId: newUser._id,
      deviceInfo,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    const accessToken = signAccessToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Please verify your email.',
      requiresVerification: true,
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          isEmailVerified: false,
          preferences: newUser.preferences,
          assignedDevice: null,
        },
        accessToken,
        refreshToken: session.refreshToken,
      },
    });
  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Registration failed due to an unexpected error.',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and establishes a new session.
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIALS',
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsersCollection();

    const user = await users.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    // Establish authenticated session
    const session = await createSession({
      userId: user._id,
      deviceInfo,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    const accessToken = signAccessToken(user);

    return res.json({
      success: true,
      requiresVerification: !user.isEmailVerified,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: Boolean(user.isEmailVerified),
          preferences: user.preferences,
          assignedDevice: user.assignedDevice || null,
        },
        accessToken,
        refreshToken: session.refreshToken,
      },
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Login failed due to an unexpected server error.',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Rotates the refresh token and issues a new access token.
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_REQUIRED',
        message: 'Refresh token is required.',
      });
    }

    const rotationResult = await rotateRefreshToken({
      refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    if (!rotationResult.success) {
      const statusCode = rotationResult.code === 'TOKEN_REUSE_DETECTED' ? 401 : 401;
      return res.status(statusCode).json(rotationResult);
    }

    const users = getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(rotationResult.userId) });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User account not found.',
      });
    }

    const newAccessToken = signAccessToken(user);

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: rotationResult.refreshToken,
      },
    });
  } catch (err) {
    console.error('[REFRESH ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Token refresh failed.',
    });
  }
});

/**
 * POST /api/auth/logout
 * Revokes the specific refresh token session.
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeSession(refreshToken);
    }

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    console.error('[LOGOUT ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Logout failed.',
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Revokes all sessions for the authenticated user across all devices.
 */
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await revokeAllUserSessions(req.userId);
    return res.json({
      success: true,
      message: 'All sessions across all devices have been terminated.',
    });
  } catch (err) {
    console.error('[LOGOUT-ALL ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to revoke all sessions.',
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Generates a new verification token and resends verification email.
 */
router.post('/resend-verification', resendVerificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'EMAIL_REQUIRED',
        message: 'Email address is required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsersCollection();
    const verificationTokens = getVerificationTokensCollection();

    const user = await users.findOne({ email: normalizedEmail });

    // Always respond with success to prevent email enumeration
    if (user && !user.isEmailVerified) {
      // Clean up previous verification tokens for this user
      await verificationTokens.deleteMany({ userId: user._id, type: 'email_verification' });

      // Generate fresh token (24-hour expiration)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await verificationTokens.insertOne({
        tokenHash,
        userId: user._id,
        type: 'email_verification',
        createdAt: new Date(),
        expiresAt,
      });

      await sendVerificationEmail(normalizedEmail, user.name, rawToken);
    }

    return res.json({
      success: true,
      message: 'If an unverified account exists with this email, a verification link has been sent.',
    });
  } catch (err) {
    console.error('[RESEND VERIFICATION ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to resend verification email.',
    });
  }
});

/**
 * GET /api/auth/verify-email
 * Validates verification token and marks user email as verified.
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_REQUIRED',
        message: 'Verification token is required.',
      });
    }

    const tokenHash = hashToken(token.trim());
    const verificationTokens = getVerificationTokensCollection();
    const users = getUsersCollection();

    const tokenDoc = await verificationTokens.findOne({
      tokenHash,
      type: 'email_verification',
    });

    if (!tokenDoc) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid or already used verification token.',
      });
    }

    // Explicit expiration check
    if (new Date() > new Date(tokenDoc.expiresAt)) {
      await verificationTokens.deleteOne({ _id: tokenDoc._id });
      return res.status(400).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    // Mark email verified
    await users.updateOne(
      { _id: tokenDoc.userId },
      {
        $set: {
          isEmailVerified: true,
          updatedAt: new Date(),
        },
      }
    );

    // Invalidate token
    await verificationTokens.deleteOne({ _id: tokenDoc._id });

    // Respond with clean HTML page or JSON
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    if (acceptsHtml) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>WattWise - Email Verified</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { background-color: #F5F7F2; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: white; border: 1px solid #E9EDE7; border-radius: 20px; padding: 40px; max-width: 440px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
              h1 { color: #123D32; font-size: 22px; margin-bottom: 12px; }
              p { color: #87918A; font-size: 14px; line-height: 1.6; }
              .badge { display: inline-block; background: #E7F0E9; color: #123D32; font-weight: bold; padding: 8px 16px; border-radius: 20px; margin-top: 16px; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Email Verified Successfully</h1>
              <p>Your WattWise account is now active. You can return to the mobile application to start monitoring your appliance energy usage.</p>
              <div class="badge">Verified &#10003;</div>
            </div>
          </body>
        </html>
      `);
    }

    return res.json({
      success: true,
      message: 'Email verified successfully. You may now access all application features.',
    });
  } catch (err) {
    console.error('[VERIFY EMAIL ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to verify email.',
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        isEmailVerified: Boolean(req.user.isEmailVerified),
        providers: req.user.providers,
        preferences: req.user.preferences,
        assignedDevice: req.user.assignedDevice || null,
        createdAt: req.user.createdAt,
      },
    },
  });
});

/**
 * GET /api/auth/protected-test
 * Verifies that unverified accounts are blocked from protected app functionality.
 */
router.get('/protected-test', requireAuth, requireVerifiedEmail, (req, res) => {
  return res.json({
    success: true,
    message: 'Access granted to protected energy monitoring resource.',
    user: {
      id: req.user._id,
      email: req.user.email,
    },
  });
});

module.exports = router;
