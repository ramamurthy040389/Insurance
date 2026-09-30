const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');

const connectDatabase = async (uri = env.MONGODB_URI, options = {}) => {
  try {
    const defaultOptions = {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      family: 4,
      ...options
    };

    mongoose.connection.on('connected', () => {
      logger.info({ uri: uri.replace(/\/\/.*@/, '//***:***@') }, 'MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error occurred');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(uri, defaultOptions);
    try {
      const setupIndexes = require('./setupIndexes');
      await setupIndexes();
    } catch (idxErr) {
      logger.warn({ error: idxErr.message }, 'Non-fatal error syncing indexes during database connection');
    }
    return mongoose.connection;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to connect to MongoDB');
    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected gracefully');
    }
  } catch (error) {
    logger.error({ error: error.message }, 'Error disconnecting from MongoDB');
    throw error;
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  mongoose
};
