const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

const {
  getClient,
  getUsersCollection,
  getVerificationTokensCollection,
  getSessionsCollection,
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
  sendPasswordResetEmail,
} = require('../services/emailService');
const {
  requireAuth,
  requireVerifiedEmail,
} = require('../middleware/authMiddleware');
const {
  loginLimiter,
  registerLimiter,
  resendVerificationLimiter,
  refreshLimiter,
  passwordResetLimiter,
  resetAttemptLimiter,
} = require('../middleware/rateLimiter');

const router = express.Router();

// Email format regular expression
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Standard password policy validation shared across registration and password reset.
 * Enforces minimum 8 characters, at least one letter, and at least one number.
 */
function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    return {
      isValid: false,
      code: 'INVALID_PASSWORD',
      message: 'Password must be at least 8 characters long.',
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      code: 'WEAK_PASSWORD',
      message: 'Password must contain at least one letter and one number.',
    };
  }

  return { isValid: true };
}

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

    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        code: passwordCheck.code,
        message: passwordCheck.message,
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

    // Strict input type validation: reject missing, null, array, object, number, boolean
    if (
      !email ||
      typeof email !== 'string' ||
      email.trim().length === 0 ||
      !password ||
      typeof password !== 'string' ||
      password.length === 0
    ) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CREDENTIALS_PAYLOAD',
        message: 'Email and password must be valid, non-empty text strings.',
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
 * Rotates the refresh token and issues a new access token with rate limiting.
 */
router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_REQUIRED',
        message: 'Refresh token must be a valid, non-empty string.',
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
 * POST /api/auth/forgot-password
 * Initiates the password recovery flow for registered users.
 * Returns an identical generic message to prevent account enumeration.
 */
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || email.trim().length === 0 || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        message: 'A valid email address is required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsersCollection();
    const verificationTokens = getVerificationTokensCollection();

    const user = await users.findOne({ email: normalizedEmail });

    // Only generate reset token if user exists and has a password credentials account
    if (user && user.passwordHash) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes TTL

      const newTokenDoc = {
        tokenHash,
        userId: user._id,
        type: 'password_reset',
        createdAt: now,
        expiresAt,
      };

      await verificationTokens.insertOne(newTokenDoc);

      // Attempt email delivery
      let deliverySuccessful = false;
      try {
        const emailResult = await sendPasswordResetEmail(normalizedEmail, user.name, rawToken);
        if (emailResult && (emailResult.delivered === true || emailResult.simulated === true)) {
          deliverySuccessful = true;
        }
      } catch (err) {
        console.error('[EMAIL ERROR] sendPasswordResetEmail failed for user ID:', user._id, err.message);
      }

      if (deliverySuccessful) {
        // Delivery confirmed: invalidate any previous password_reset tokens for this user
        await verificationTokens.deleteMany({
          userId: user._id,
          type: 'password_reset',
          _id: { $ne: newTokenDoc._id },
        });
      } else {
        // Delivery failed: delete the newly generated token and retain any previous valid token
        await verificationTokens.deleteOne({ _id: newTokenDoc._id });
      }
    }

    // Always return generic response to prevent account enumeration
    return res.json({
      success: true,
      message: 'If an account with this email exists, password reset instructions have been sent.',
    });
  } catch (err) {
    console.error('[FORGOT PASSWORD ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to process password reset request.',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Completes password recovery using a single-use token and updates passwordHash atomically.
 * Automatically revokes all existing active sessions.
 */
router.post('/reset-password', resetAttemptLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_REQUIRED',
        message: 'Reset token is required.',
      });
    }

    const passwordCheck = validatePasswordPolicy(newPassword);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        code: passwordCheck.code,
        message: passwordCheck.message,
      });
    }

    const tokenHash = hashToken(token.trim());
    const client = getClient();
    const users = getUsersCollection();
    const verificationTokens = getVerificationTokensCollection();
    const sessions = getSessionsCollection();

    // Compute bcrypt hash outside the MongoDB transaction callback
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const mongoSession = client.startSession();
    try {
      await mongoSession.withTransaction(async () => {
        const tokenDoc = await verificationTokens.findOne(
          { tokenHash, type: 'password_reset' },
          { session: mongoSession }
        );

        if (!tokenDoc) {
          const err = new Error('Password reset link is invalid or has already been used.');
          err.code = 'INVALID_OR_CONSUMED_TOKEN';
          err.statusCode = 400;
          throw err;
        }

        if (new Date() > new Date(tokenDoc.expiresAt)) {
          const err = new Error('Password reset link has expired. Please request a new one.');
          err.code = 'TOKEN_EXPIRED';
          err.statusCode = 400;
          err.expiredTokenId = tokenDoc._id;
          throw err;
        }

        const deleteResult = await verificationTokens.deleteOne(
          { _id: tokenDoc._id },
          { session: mongoSession }
        );

        if (deleteResult.deletedCount === 0) {
          const err = new Error('Password reset link is invalid or has already been used.');
          err.code = 'INVALID_OR_CONSUMED_TOKEN';
          err.statusCode = 400;
          throw err;
        }

        const userUpdate = await users.updateOne(
          { _id: tokenDoc.userId },
          {
            $set: {
              passwordHash,
              updatedAt: new Date(),
            },
          },
          { session: mongoSession }
        );

        if (userUpdate.matchedCount === 0) {
          const err = new Error('User account associated with this token no longer exists.');
          err.code = 'USER_NOT_FOUND';
          err.statusCode = 400;
          throw err;
        }

        await sessions.updateMany(
          { userId: tokenDoc.userId, isValid: true },
          {
            $set: {
              isValid: false,
              revocationReason: 'password_reset',
              revokedAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { session: mongoSession }
        );
      });
    } catch (txErr) {
      if (txErr.expiredTokenId) {
        try {
          await verificationTokens.deleteOne({ _id: txErr.expiredTokenId });
        } catch (_) {}
      }
      if (txErr.statusCode) {
        return res.status(txErr.statusCode).json({
          success: false,
          code: txErr.code,
          message: txErr.message,
        });
      }
      throw txErr;
    } finally {
      await mongoSession.endSession();
    }

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new password.',
    });
  } catch (err) {
    console.error('[RESET PASSWORD ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to reset password.',
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
