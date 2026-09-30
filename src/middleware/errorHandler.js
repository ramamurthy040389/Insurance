const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/httpStatus');

/**
 * Centralized Express Error Handling Middleware
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let details = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // Mongoose schema validation error
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = HTTP_STATUS.CONFLICT;
    errorCode = ERROR_CODES.CONFLICT;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate record found with matching ${field}`;
    details = [`A document with this ${field} already exists`];
  } else if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.BAD_REQUEST;
    message = `Invalid format for field '${err.path}'`;
    details = [err.message];
  } else if (err.name === 'MulterError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.BAD_REQUEST;
    message = err.message;
    details = [err.code];
  } else if (err.status && typeof err.status === 'number') {
    statusCode = err.status;
    message = err.message || message;
  }

  // Log error with request context
  if (statusCode >= 500) {
    logger.error({
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      statusCode,
      errorCode,
      message,
      stack: err.stack
    }, 'Internal Server Error');
  } else {
    logger.warn({
      url: req.originalUrl,
      method: req.method,
      statusCode,
      errorCode,
      message,
      details
    }, 'Client Request Error');
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details: details.length > 0 ? details : undefined
    }
  });
}

/**
 * 404 Route Not Found Middleware
 */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}

module.exports = {
  errorHandler,
  notFoundHandler
};
