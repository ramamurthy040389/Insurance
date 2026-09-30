const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const logger = require('./utils/logger');
const { initSocket, closeSocket } = require('./config/socket');
const { startMessageJob, stopMessageJob } = require('./jobs/message.job');
const { startCpuMonitorJob, stopCpuMonitorJob } = require('./jobs/cpuMonitor.job');

let server = null;
let isShuttingDown = false;

/**
 * Graceful Shutdown Handler
 */
async function gracefulShutdown(reason = 'UNKNOWN_REASON', exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn({ reason }, 'Initiating graceful server shutdown');

  // Stop background jobs and socket server
  try {
    closeSocket();
    stopMessageJob();
    stopCpuMonitorJob();
  } catch (err) {
    logger.error({ error: err.message }, 'Error stopping background jobs during shutdown');
  }

  // Stop accepting new HTTP requests
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed. No longer accepting new connections.');

      // Disconnect from MongoDB
      try {
        await disconnectDatabase();
      } catch (err) {
        logger.error({ error: err.message }, 'Error disconnecting MongoDB during shutdown');
      }

      logger.info({ exitCode }, 'Graceful shutdown completed. Exiting process.');
      process.exit(exitCode);
    });

    // Force exit after 10s timeout if connections remain hung
    setTimeout(() => {
      logger.error('Graceful shutdown timed out after 10 seconds. Forcing process exit.');
      process.exit(exitCode || 1);
    }, 10000).unref();
  } else {
    await disconnectDatabase();
    process.exit(exitCode);
  }
}

/**
 * Main application bootstrap
 */
async function startServer() {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Start HTTP Server with Socket.IO
    server = http.createServer(app);
    initSocket(server);

    // Mount and start HTTP and Socket.IO server
    server.listen(env.PORT, () => {
      logger.info({
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        docs: `http://localhost:${env.PORT}/api-docs`,
        health: `http://localhost:${env.PORT}/health`,
        realtime: `http://localhost:${env.PORT}/realtime`
      }, 'Insurance Policy Management API Server started successfully (with Socket.IO)');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.fatal(`Port ${env.PORT} is already in use by another process. Please terminate the existing process or set PORT in .env.`);
      } else {
        logger.fatal({ error: err.message }, 'HTTP server error occurred');
      }
      gracefulShutdown('SERVER_LISTEN_ERROR', 1);
    });

    // 3. Start Background Schedulers
    startMessageJob();

    // 4. Start CPU Utilization Monitor with restart handler callback
    startCpuMonitorJob(async (triggerReason) => {
      logger.error({ triggerReason }, 'CPU Monitor triggered server restart');
      await gracefulShutdown(triggerReason, 1);
    });

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM_RECEIVED', 0));
    process.on('SIGINT', () => gracefulShutdown('SIGINT_RECEIVED', 0));

    process.on('uncaughtException', (err) => {
      logger.fatal({ error: err.message, stack: err.stack }, 'Uncaught Exception occurred');
      gracefulShutdown('UNCAUGHT_EXCEPTION', 1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason }, 'Unhandled Promise Rejection occurred');
      gracefulShutdown('UNHANDLED_REJECTION', 1);
    });
  } catch (error) {
    logger.fatal({ error: error.message, stack: error.stack }, 'Application bootstrap failed');
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, gracefulShutdown };
