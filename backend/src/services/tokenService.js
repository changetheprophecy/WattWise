const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getSessionsCollection } = require('../config/db');

/**
 * Validates and retrieves the JWT signing secret from environment variables.
 * Fails safely at startup if missing or invalid without exposing environment variables or printing secrets.
 */
function getValidatedJwtSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error(
      'Fatal configuration error: JWT_ACCESS_SECRET environment variable is missing, empty, or insecure (minimum 32 characters required). Server startup aborted.'
    );
  }
  return secret.trim();
}

const ACCESS_TOKEN_SECRET = getValidatedJwtSecret();
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Computes a SHA-256 hash of a raw token string for secure database persistence.
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Signs a short-lived JWT access token containing essential user claims.
 */
function signAccessToken(user) {
  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    email: user.email,
    isEmailVerified: Boolean(user.isEmailVerified),
  };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Verifies and decodes a JWT access token.
 */
function verifyAccessToken(token) {
  try {
    return { payload: jwt.verify(token, ACCESS_TOKEN_SECRET), error: null };
  } catch (err) {
    return { payload: null, error: err.name || 'JsonWebTokenError' };
  }
}

/**
 * Creates a new session with a unique familyId and initial refresh token.
 */
async function createSession({ userId, deviceInfo = {}, ipAddress = '', userAgent = '' }) {
  const sessions = getSessionsCollection();
  if (!sessions) {
    throw new Error('Database not initialized');
  }

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawRefreshToken);
  const familyId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  const sessionDoc = {
    familyId,
    userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
    currentHash: tokenHash,
    previousHashes: [],
    isValid: true,
    deviceInfo: {
      platform: deviceInfo.platform || 'unknown',
      deviceName: deviceInfo.deviceName || 'Device',
      appVersion: deviceInfo.appVersion || '1.0.0',
    },
    ipAddress,
    userAgent,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await sessions.insertOne(sessionDoc);

  return {
    refreshToken: rawRefreshToken,
    familyId,
    expiresAt,
  };
}

/**
 * Rotates a refresh token with strict session family reuse detection.
 * Uses atomic findOneAndUpdate to prevent race conditions during concurrent refresh attempts.
 */
async function rotateRefreshToken({ refreshToken, ipAddress = '', userAgent = '' }) {
  const sessions = getSessionsCollection();
  if (!sessions) {
    throw new Error('Database not initialized');
  }

  if (!refreshToken || typeof refreshToken !== 'string') {
    return { success: false, code: 'INVALID_TOKEN', message: 'Refresh token is required' };
  }

  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  // 1. Check if token is the current active hash for an existing session
  const currentSession = await sessions.findOne({ currentHash: tokenHash });

  if (currentSession) {
    // Explicit expiration check (independent of MongoDB TTL background cleanup)
    if (now > new Date(currentSession.expiresAt)) {
      return { success: false, code: 'SESSION_EXPIRED', message: 'Session has expired. Please sign in again.' };
    }

    if (!currentSession.isValid) {
      return { success: false, code: 'SESSION_REVOKED', message: 'Session has been revoked.' };
    }

    // Generate new rotated token
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    // ATOMIC update: Only succeeds if currentHash still matches and isValid is true
    const updatedSession = await sessions.findOneAndUpdate(
      {
        _id: currentSession._id,
        currentHash: tokenHash,
        isValid: true,
      },
      {
        $set: {
          currentHash: newHash,
          ipAddress: ipAddress || currentSession.ipAddress,
          userAgent: userAgent || currentSession.userAgent,
          updatedAt: now,
          expiresAt: newExpiresAt,
        },
        $push: {
          previousHashes: tokenHash,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedSession) {
      // Concurrent refresh caught by atomic condition
      return {
        success: false,
        code: 'CONCURRENT_REFRESH',
        message: 'A token refresh was already processed. Please use the newly issued token.',
      };
    }

    return {
      success: true,
      refreshToken: newRawRefreshToken,
      userId: currentSession.userId,
      familyId: currentSession.familyId,
    };
  }

  // 2. Reuse Detection: Check if token exists in previousHashes of ANY session
  const reusedSession = await sessions.findOne({ previousHashes: tokenHash });

  if (reusedSession) {
    // TOKEN REUSE DETECTED: Immediately revoke all tokens in the affected session family!
    await sessions.updateOne(
      { familyId: reusedSession.familyId },
      {
        $set: {
          isValid: false,
          revocationReason: 'token_reuse_detected',
          revokedAt: now,
          updatedAt: now,
        },
      }
    );

    console.warn(`[SECURITY ALERT] Refresh token reuse detected in family: ${reusedSession.familyId}. Family revoked.`);

    return {
      success: false,
      code: 'TOKEN_REUSE_DETECTED',
      message: 'Security warning: Refresh token reuse detected. This session lineage has been terminated.',
    };
  }

  // 3. Not found as current or rotated token
  return {
    success: false,
    code: 'INVALID_TOKEN',
    message: 'Invalid or unrecognized refresh token.',
  };
}

/**
 * Revokes a single session by its active refresh token.
 */
async function revokeSession(refreshToken) {
  const sessions = getSessionsCollection();
  if (!sessions || !refreshToken) return false;

  const tokenHash = hashToken(refreshToken);
  const result = await sessions.updateOne(
    { currentHash: tokenHash },
    {
      $set: {
        isValid: false,
        revocationReason: 'user_logout',
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Revokes all sessions belonging to a specific session family.
 */
async function revokeSessionFamily(familyId) {
  const sessions = getSessionsCollection();
  if (!sessions || !familyId) return false;

  const result = await sessions.updateOne(
    { familyId },
    {
      $set: {
        isValid: false,
        revocationReason: 'family_revocation',
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Revokes all sessions for a user across all devices (Global Logout).
 */
async function revokeAllUserSessions(userId) {
  const sessions = getSessionsCollection();
  if (!sessions || !userId) return 0;

  const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
  const result = await sessions.updateMany(
    { userId: uid, isValid: true },
    {
      $set: {
        isValid: false,
        revocationReason: 'global_logout',
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}

module.exports = {
  hashToken,
  signAccessToken,
  verifyAccessToken,
  createSession,
  rotateRefreshToken,
  revokeSession,
  revokeSessionFamily,
  revokeAllUserSessions,
};
