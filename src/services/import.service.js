const { Worker } = require('worker_threads');
const path = require('path');
const logger = require('../utils/logger');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

class ImportService {
  /**
   * Spawns a dedicated Worker Thread to parse and import CSV / XLSX files
   * Keeps the main Express event loop responsive
   */
  async processFileInWorker(file) {
    if (!file || !file.path) {
      throw ApiError.badRequest('No file provided for import');
    }

    const workerPath = path.resolve(__dirname, '../workers/import.worker.js');

    logger.info({
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }, 'Starting bulk import via Worker Thread');

    try {
      const { broadcast } = require('../config/socket');
      broadcast('bulk_import_started', {
        filename: file.originalname,
        size: file.size,
        timestamp: new Date().toISOString()
      });
    } catch (_) {}

    return new Promise((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: {
          filePath: file.path,
          originalname: file.originalname,
          mimetype: file.mimetype,
          mongoUri: (process.env.NODE_ENV === 'test' 
            ? (process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/insurance_test') 
            : env.MONGODB_URI)
        }
      });

      worker.on('message', (result) => {
        if (result.success) {
          logger.info({
            summary: result.summary,
            insertedCounts: result.summary.insertedCounts,
            entities: result.entities,
            errorCount: result.validationErrors ? result.validationErrors.length : 0
          }, 'Bulk import completed successfully in Worker Thread');
          console.log(`[MAIN THREAD] [IMPORT SUCCESS] Bulk import completed:`);
          console.log(`  - Total Rows in File: ${result.summary.totalRows}`);
          console.log(`  - Successfully Processed: ${result.summary.processed}`);
          console.log(`  - Policies Inserted: ${result.summary.inserted}`);
          console.log(`  - Policies Updated: ${result.summary.updated}`);
          console.log(`  - Failed / Rejected Rows: ${result.summary.failed}`);
          if (result.summary.insertedCounts) {
            console.log(`  - New Master Entities Inserted:`);
            console.log(`    * Users: ${result.summary.insertedCounts.users}`);
            console.log(`    * Agents: ${result.summary.insertedCounts.agents}`);
            console.log(`    * Accounts: ${result.summary.insertedCounts.accounts}`);
            console.log(`    * Categories: ${result.summary.insertedCounts.categories}`);
            console.log(`    * Carriers: ${result.summary.insertedCounts.carriers}`);
          }
          console.log(`  - Verified Total Database Entity Counts:`, result.entities);

          try {
            const { broadcast } = require('../config/socket');
            broadcast('bulk_import_completed', {
              filename: file.originalname,
              summary: result.summary,
              entities: result.entities,
              timestamp: new Date().toISOString()
            });
          } catch (_) {}

          resolve(result);
        } else {
          logger.error({ error: result.error, stack: result.stack }, 'Bulk import failed inside Worker Thread');
          console.error(`[MAIN THREAD] [IMPORT FAILED] Worker Thread error: ${result.error}`);
          reject(ApiError.badRequest(`Import failed: ${result.error}`));
        }
      });

      worker.on('error', (err) => {
        logger.error({ error: err.message, stack: err.stack }, 'Worker Thread encountered an unhandled error');
        reject(ApiError.internal(`Worker Thread execution error: ${err.message}`));
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          logger.warn({ exitCode: code }, 'Import worker thread exited with non-zero code');
        }
      });
    });
  }
}

module.exports = new ImportService();
