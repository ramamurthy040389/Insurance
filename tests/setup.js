const mongoose = require('mongoose');
const env = require('../src/config/env');

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/insurance_test';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    // Drop test database and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

beforeEach(async () => {
  // Clean up collections between tests
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});
