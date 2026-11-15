const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

// Login rate limiter: 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

// Registration rate limiter: 5 attempts per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many accounts registered from this IP. Please try again later.',
  },
});

// Resend email verification rate limiter: 3 requests per hour
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many verification requests. Please wait before requesting another email.',
  },
});

// Password reset rate limiter: 3 requests per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many password reset requests. Please try again later.',
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  resendVerificationLimiter,
  passwordResetLimiter,
};
