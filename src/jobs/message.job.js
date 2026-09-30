const messageService = require('../services/message.service');
const logger = require('../utils/logger');
const env = require('../config/env');

let jobTimer = null;
let isJobRunning = false;

/**
 * Start the background worker for processing scheduled messages
 */
function startMessageJob() {
  if (!env.MESSAGE_JOB_ENABLED) {
    logger.info('Scheduled message job is disabled by environment configuration');
    return;
  }

  logger.info({ intervalMs: env.MESSAGE_JOB_INTERVAL_MS }, 'Starting Scheduled Message background job');

  const executeJob = async () => {
    if (isJobRunning) {
      return; // Skip if previous run is still active
    }

    isJobRunning = true;
    try {
      const processed = await messageService.processDueMessages();
      if (processed > 0) {
        logger.info({ count: processed }, 'Processed due scheduled messages in background worker');
      }
    } catch (err) {
      logger.error({ error: err.message }, 'Error in scheduled message background job');
    } finally {
      isJobRunning = false;
    }
  };

  // Run initial check immediately
  executeJob();

  // Schedule recurring interval
  jobTimer = setInterval(executeJob, env.MESSAGE_JOB_INTERVAL_MS);

  if (jobTimer.unref) {
    jobTimer.unref();
  }
}

/**
 * Stop background worker gracefully
 */
function stopMessageJob() {
  if (jobTimer) {
    clearInterval(jobTimer);
    jobTimer = null;
    logger.info('Scheduled message background job stopped');
  }
}

module.exports = {
  startMessageJob,
  stopMessageJob
};
