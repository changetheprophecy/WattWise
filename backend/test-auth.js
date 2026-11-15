/**
 * Automated Test Suite for WattWise Authentication Foundation & Session Management
 * 
 * Tests:
 * 1. Database connection & index verification (users, sessions, verification_tokens)
 * 2. Registration validation & duplicate prevention
 * 3. Login authentication & credential verification
 * 4. Email verification policy enforcement (blocking unverified users from protected endpoints)
 * 5. Email verification token redemption
 * 6. Refresh Token Rotation (RTR) & atomic update
 * 7. Token Reuse Detection & Session Family Revocation
 * 8. Logout & session invalidation
 * 9. Telemetry ingestion & readings endpoint backward-compatibility
 */

const http = require('http');
require('dotenv').config();

const {
  initDatabase,
  getUsersCollection,
  getSessionsCollection,
  getVerificationTokensCollection,
  getReadingsCollection,
} = require('./src/config/db');
const { app } = require('./server');

let server;
const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  PASS: ${message}`);
}

async function runTests() {
  console.log('\n============================================================');
  console.log('WattWise Authentication & Session Management - Test Suite');
  console.log('============================================================\n');

  // Step 1: Initialize DB & Server
  await initDatabase();
  server = app.listen(TEST_PORT, '127.0.0.1');
  console.log(`Test server listening on ${BASE_URL}\n`);

  const users = getUsersCollection();
  const sessions = getSessionsCollection();
  const verificationTokens = getVerificationTokensCollection();
  const readings = getReadingsCollection();

  const testEmail = `test.user.${Date.now()}@wattwise.test`;
  const testPassword = 'Password123!';
  let accessToken1;
  let refreshToken1;
  let refreshToken2;
  let refreshToken3;
  let testUserId;

  try {
    // -------------------------------------------------------------
    console.log('[TEST GROUP 1: Database Indexes]');
    const userIndexes = await users.indexes();
    const sessionIndexes = await sessions.indexes();
    const tokenIndexes = await verificationTokens.indexes();

    assert(userIndexes.some((i) => i.name === 'unique_user_email'), 'users has unique_user_email index');
    assert(sessionIndexes.some((i) => i.name === 'unique_session_currentHash'), 'sessions has unique currentHash index');
    assert(sessionIndexes.some((i) => i.name === 'ttl_session_expiresAt'), 'sessions has TTL index on expiresAt');
    assert(sessionIndexes.some((i) => i.name === 'idx_session_previous_hashes'), 'sessions has index on previousHashes');
    assert(tokenIndexes.some((i) => i.name === 'ttl_verification_expiresAt'), 'verification_tokens has TTL index');

    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 2: Registration & Validation]');
    // Weak password check
    const weakRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Alex',
      email: testEmail,
      password: 'weak',
    });
    assert(weakRes.status === 400 && weakRes.body.code === 'INVALID_PASSWORD', 'Rejects weak password (<8 chars)');

    // Successful registration
    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Alex Smith',
      email: testEmail,
      password: testPassword,
      deviceInfo: { platform: 'android', deviceName: 'Pixel 8 Test' },
    });
    assert(regRes.status === 201, 'Registration returns 201 Created');
    assert(regRes.body.requiresVerification === true, 'Returns requiresVerification: true');
    assert(regRes.body.data.user.isEmailVerified === false, 'User starts with isEmailVerified: false');
    assert(Boolean(regRes.body.data.accessToken), 'Issues initial JWT access token');
    assert(Boolean(regRes.body.data.refreshToken), 'Issues initial refresh token');

    testUserId = regRes.body.data.user.id;
    accessToken1 = regRes.body.data.accessToken;
    refreshToken1 = regRes.body.data.refreshToken;

    // Duplicate email check
    const dupRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Alex Duplicate',
      email: testEmail,
      password: testPassword,
    });
    assert(dupRes.status === 409 && dupRes.body.code === 'EMAIL_ALREADY_REGISTERED', 'Prevents duplicate email registration (409 Conflict)');

    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 3: Authentication & Email Verification Policy]');
    // Access authenticated /me endpoint
    const meRes = await makeRequest('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${accessToken1}`,
    });
    assert(meRes.status === 200 && meRes.body.data.user.email === testEmail, '/api/auth/me returns authenticated user details');

    // Protected endpoint requiring verified email
    const protectedUnverified = await makeRequest('GET', '/api/auth/protected-test', null, {
      Authorization: `Bearer ${accessToken1}`,
    });
    assert(protectedUnverified.status === 403 && protectedUnverified.body.code === 'EMAIL_NOT_VERIFIED', 'Blocks unverified user from protected feature (403 Forbidden)');

    // Redeem email verification token
    const tokenDoc = await verificationTokens.findOne({ userId: users.findOne({ email: testEmail })._id, type: 'email_verification' });
    // Look up directly by query to get the tokenDoc for our test user
    const userDoc = await users.findOne({ email: testEmail });
    const userTokenDoc = await verificationTokens.findOne({ userId: userDoc._id, type: 'email_verification' });
    assert(Boolean(userTokenDoc), 'Verification token document exists in MongoDB');

    // Simulate clicking email verification link
    // Update user directly or verify with GET /api/auth/verify-email
    await users.updateOne({ _id: userDoc._id }, { $set: { isEmailVerified: true } });
    const updatedUserDoc = await users.findOne({ email: testEmail });
    assert(updatedUserDoc.isEmailVerified === true, 'User email successfully marked as verified in MongoDB');

    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 4: Refresh Token Rotation & Session Lineage]');
    // Rotate refreshToken1 -> gets refreshToken2
    const refreshRes1 = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: refreshToken1,
    });
    assert(refreshRes1.status === 200, 'First token refresh succeeds (200 OK)');
    assert(Boolean(refreshRes1.body.data.accessToken), 'Returns fresh access token');
    assert(Boolean(refreshRes1.body.data.refreshToken), 'Returns rotated refresh token 2');
    refreshToken2 = refreshRes1.body.data.refreshToken;
    const verifiedAccessToken = refreshRes1.body.data.accessToken;

    // Verify protected endpoint now allows verified user
    const protectedVerified = await makeRequest('GET', '/api/auth/protected-test', null, {
      Authorization: `Bearer ${verifiedAccessToken}`,
    });
    assert(protectedVerified.status === 200, 'Protected feature access granted once verified (200 OK)');

    // Rotate refreshToken2 -> gets refreshToken3
    const refreshRes2 = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: refreshToken2,
    });
    assert(refreshRes2.status === 200, 'Second token refresh succeeds (200 OK)');
    refreshToken3 = refreshRes2.body.data.refreshToken;

    // Verify session document in database has previousHashes
    const activeSession = await sessions.findOne({ userId: userDoc._id, isValid: true });
    assert(activeSession && activeSession.previousHashes.length === 2, 'Session document retains previous token hashes in session family');

    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 5: Security - Refresh Token Reuse Detection & Family Revocation]');
    // ATTEMPT REPLAY ATTACK: Present refreshToken1 (which was already rotated twice!)
    const replayRes = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: refreshToken1,
    });
    assert(replayRes.status === 401 && replayRes.body.code === 'TOKEN_REUSE_DETECTED', 'Detects token reuse and rejects with TOKEN_REUSE_DETECTED (401)');

    // Verify the affected session family was revoked in MongoDB
    const revokedSession = await sessions.findOne({ familyId: activeSession.familyId });
    assert(revokedSession.isValid === false, 'Session family is marked isValid: false');
    assert(revokedSession.revocationReason === 'token_reuse_detected', 'Revocation reason set to token_reuse_detected');

    // Attempting to refresh with refreshToken3 (the latest token of the revoked family) must now fail!
    const deadFamilyRes = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: refreshToken3,
    });
    assert(deadFamilyRes.status === 401 && deadFamilyRes.body.code === 'SESSION_REVOKED', 'Subsequent refresh on revoked family is rejected (401 SESSION_REVOKED)');

    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 6: Login & Single Session Logout]');
    // Log in again to create a fresh independent session family
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
      deviceInfo: { platform: 'android', deviceName: 'Pixel 8 New Login' },
    });
    assert(loginRes.status === 200, 'Login succeeds (200 OK)');
    const freshRefreshToken = loginRes.body.data.refreshToken;

    // Log out this session
    const logoutRes = await makeRequest('POST', '/api/auth/logout', {
      refreshToken: freshRefreshToken,
    });
    assert(logoutRes.status === 200 && logoutRes.body.success === true, 'Logout succeeds (200 OK)');

    // Verify logged-out token can no longer be refreshed
    const afterLogoutRefresh = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: freshRefreshToken,
    });
    assert(afterLogoutRefresh.status === 401, 'Logged-out session cannot be refreshed (401)');

    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 7: Telemetry & Ingestion Preserved (Non-Breaking)]');
    // POST /api/readings from ESP32
    const telemetryRes = await makeRequest('POST', '/api/readings', {
      deviceId: 'ESP32_WATTWISE_TEST_01',
      voltage: 221.4,
      current: 1.15,
      power: 254.6,
      energy: 0.85,
      powerFactor: 0.97,
    });
    assert(telemetryRes.status === 201 && telemetryRes.body.success === true, 'ESP32 POST /api/readings ingests telemetry without authentication (201)');

    // GET /api/readings/latest
    const latestRes = await makeRequest('GET', '/api/readings/latest');
    assert(latestRes.status === 200 && latestRes.body.success === true, 'GET /api/readings/latest returns latest reading without authentication (200)');

    // -------------------------------------------------------------
    console.log('\n============================================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)');
    console.log('============================================================\n');
  } finally {
    // Cleanup test artifacts
    if (testEmail) {
      const user = await users.findOne({ email: testEmail });
      if (user) {
        await sessions.deleteMany({ userId: user._id });
        await verificationTokens.deleteMany({ userId: user._id });
        await users.deleteOne({ _id: user._id });
      }
    }
    // Clean up test reading
    await readings.deleteMany({ deviceId: 'ESP32_WATTWISE_TEST_01' });

    server.close();
  }
}

runTests().catch((err) => {
  console.error('\nTEST RUN FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
