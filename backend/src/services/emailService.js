const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  FROM_EMAIL = 'WattWise <noreply@wattwise.app>',
  APP_URL = 'http://localhost:5000',
} = process.env;

let transporter = null;

function getTransporter() {
  if (!transporter && SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Dispatches an email verification link to a newly registered user.
 * If SMTP credentials are not configured, gracefully logs the verification link to the console for development testing.
 */
async function sendVerificationEmail(to, name, rawToken) {
  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${rawToken}`;
  const subject = 'Verify your WattWise Account';

  const t = getTransporter();

  if (!t) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[EMAIL SERVICE WARNING] SMTP credentials are not configured in production. Email delivery was skipped.');
      return {
        delivered: false,
        simulated: false,
        error: 'SMTP_NOT_CONFIGURED',
        message: 'Email delivery service is currently unavailable.',
      };
    }

    console.log('\n============================================================');
    console.log('[EMAIL SERVICE - DEV SIMULATION MODE]');
    console.log(`To: ${to} (${name || 'User'})`);
    console.log(`Subject: ${subject}`);
    console.log(`Verification Link: ${verificationUrl}`);
    console.log('Notice: Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env for live email delivery.');
    console.log('============================================================\n');

    return {
      delivered: false,
      simulated: true,
      verificationUrl,
      message: 'Email delivery simulated in development mode. Verification link logged to server console.',
    };
  }

  try {
    await t.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E9EDE7; border-radius: 16px; background-color: #F5F7F2;">
          <h2 style="color: #123D32; margin-top: 0;">Welcome to WattWise</h2>
          <p style="color: #26352F; font-size: 15px; line-height: 1.5;">Hello ${name || 'WattWise User'},</p>
          <p style="color: #26352F; font-size: 15px; line-height: 1.5;">Thank you for registering. Please verify your email address to activate your energy monitoring profile.</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${verificationUrl}" style="background-color: #123D32; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="color: #87918A; font-size: 12px;">This link will expire in 24 hours. If you did not create a WattWise account, you can safely ignore this message.</p>
        </div>
      `,
    });

    return { delivered: true, simulated: false };
  } catch (err) {
    console.error('[EMAIL SERVICE ERROR] Failed to send verification email:', err.message);
    return { delivered: false, simulated: false, error: err.message };
  }
}

/**
 * Dispatches a password reset link or token.
 */
async function sendPasswordResetEmail(to, name, rawToken) {
  const resetUrl = `${APP_URL}/api/auth/reset-password?token=${rawToken}`;
  const subject = 'Reset your WattWise Password';

  const t = getTransporter();

  if (!t) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[EMAIL SERVICE WARNING] SMTP credentials are not configured in production. Password reset email was skipped.');
      return {
        delivered: false,
        simulated: false,
        error: 'SMTP_NOT_CONFIGURED',
        message: 'Password reset service is currently unavailable.',
      };
    }

    console.log('\n============================================================');
    console.log('[EMAIL SERVICE - DEV SIMULATION MODE]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset Link: ${resetUrl}`);
    console.log('============================================================\n');

    return {
      delivered: false,
      simulated: true,
      resetUrl,
      message: 'Password reset simulated in development mode. Reset link logged to server console.',
    };
  }

  try {
    await t.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E9EDE7; border-radius: 16px; background-color: #F5F7F2;">
          <h2 style="color: #123D32; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #26352F; font-size: 15px; line-height: 1.5;">Hello ${name || 'User'},</p>
          <p style="color: #26352F; font-size: 15px; line-height: 1.5;">We received a request to reset the password for your WattWise account.</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #123D32; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #87918A; font-size: 12px;">This link will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
    });

    return { delivered: true, simulated: false };
  } catch (err) {
    console.error('[EMAIL SERVICE ERROR] Failed to send password reset email:', err.message);
    return { delivered: false, simulated: false, error: err.message };
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
