const { ObjectId } = require('mongodb');
const { verifyAccessToken } = require('../services/tokenService');
const { getUsersCollection } = require('../config/db');

/**
 * Validates the JWT Bearer access token and attaches the authenticated user document to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authorization header with Bearer token is required',
      });
    }

    const token = authHeader.split(' ')[1];
    const { payload, error } = verifyAccessToken(token);

    if (error || !payload || !payload.userId) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALID',
        message: error === 'TokenExpiredError' ? 'Access token has expired' : 'Invalid access token',
      });
    }

    const users = getUsersCollection();
    const user = await users.findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { passwordHash: 0 } }
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'The user account associated with this token no longer exists',
      });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to authenticate request',
    });
  }
}

/**
 * Enforces that the authenticated user has verified their email address before accessing protected functionality.
 */
function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Email verification is required to access protected energy monitoring features.',
      requiresVerification: true,
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireVerifiedEmail,
};
