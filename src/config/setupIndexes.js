const mongoose = require('mongoose');
const models = require('../models');
const logger = require('../utils/logger');

/**
 * Ensures all collection indexes defined in schemas are synced to MongoDB
 */
async function setupIndexes() {
  logger.info('Syncing MongoDB indexes for all models...');
  for (const modelName of Object.keys(models)) {
    const model = models[modelName];
    if (model && typeof model.syncIndexes === 'function') {
      try {
        await model.syncIndexes();
        logger.info(`Indexes synchronized for model: ${modelName}`);
      } catch (err) {
        logger.error({ model: modelName, error: err.message }, 'Failed to sync indexes');
      }
    }
  }
}

module.exports = setupIndexes;
