const logger = require('../utils/logger');

/**
 * HTTP Request Logging Middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const reqId = req.headers['x-request-id'] || Math.random().toString(36).substring(2, 9);
  req.id = reqId;

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const logData = {
      reqId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${durationMs}ms`,
      ip: req.ip
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'HTTP Request Error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP Request Client Error');
    } else {
      logger.info(logData, 'HTTP Request Completed');
    }
  });

  next();
}

module.exports = requestLogger;
