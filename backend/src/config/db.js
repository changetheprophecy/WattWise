const { MongoClient } = require('mongodb');
require('dotenv').config();

let client = null;
let db = null;

let usersCollection = null;
let sessionsCollection = null;
let verificationTokensCollection = null;
let readingsCollection = null;

/**
 * Initializes MongoDB connection and sets up required collections and indexes.
 */
async function initDatabase(customUri) {
  const uri = customUri || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing from environment variables');
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();

    // Bind collection references
    usersCollection = db.collection('users');
    sessionsCollection = db.collection('sessions');
    verificationTokensCollection = db.collection('verification_tokens');
    readingsCollection = db.collection('readings');

    // Create required indexes
    await setupIndexes();

    console.log('MongoDB Atlas connected & indexes verified successfully');
  }

  return {
    client,
    db,
    usersCollection,
    sessionsCollection,
    verificationTokensCollection,
    readingsCollection,
  };
}

/**
 * Ensures all required indexes exist with proper constraints.
 */
async function setupIndexes() {
  if (!db) return;

  // 1. Users collection indexes
  await usersCollection.createIndex(
    { email: 1 },
    { unique: true, background: true, name: 'unique_user_email' }
  );
  await usersCollection.createIndex(
    { googleId: 1 },
    { sparse: true, background: true, name: 'sparse_user_googleId' }
  );

  // 2. Sessions collection indexes (with TTL and Family ID)
  await sessionsCollection.createIndex(
    { currentHash: 1 },
    { unique: true, background: true, name: 'unique_session_currentHash' }
  );
  await sessionsCollection.createIndex(
    { familyId: 1, isValid: 1 },
    { background: true, name: 'idx_session_family_status' }
  );
  await sessionsCollection.createIndex(
    { userId: 1, isValid: 1 },
    { background: true, name: 'idx_session_user_status' }
  );
  await sessionsCollection.createIndex(
    { previousHashes: 1 },
    { background: true, name: 'idx_session_previous_hashes' }
  );
  // TTL index for automated background cleanup of expired sessions
  await sessionsCollection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true, name: 'ttl_session_expiresAt' }
  );

  // 3. Verification tokens collection indexes (with TTL)
  await verificationTokensCollection.createIndex(
    { tokenHash: 1, type: 1 },
    { unique: true, background: true, name: 'unique_verification_token' }
  );
  await verificationTokensCollection.createIndex(
    { userId: 1, type: 1 },
    { background: true, name: 'idx_verification_user_type' }
  );
  await verificationTokensCollection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true, name: 'ttl_verification_expiresAt' }
  );

  // 4. Existing Readings collection indexes (preserved for telemetry performance)
  await readingsCollection.createIndex(
    { timestamp: -1, _id: -1 },
    { background: true, name: 'idx_readings_timestamp' }
  );
  await readingsCollection.createIndex(
    { deviceId: 1, timestamp: -1 },
    { background: true, name: 'idx_readings_deviceId_timestamp' }
  );
}

function getClient() {
  return client;
}

function getDb() {
  return db;
}

function getUsersCollection() {
  return usersCollection;
}

function getSessionsCollection() {
  return sessionsCollection;
}

function getVerificationTokensCollection() {
  return verificationTokensCollection;
}

function getReadingsCollection() {
  return readingsCollection;
}

module.exports = {
  initDatabase,
  getClient,
  getDb,
  getUsersCollection,
  getSessionsCollection,
  getVerificationTokensCollection,
  getReadingsCollection,
};
