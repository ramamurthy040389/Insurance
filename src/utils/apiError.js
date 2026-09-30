const { HTTP_STATUS, ERROR_CODES } = require('../constants/httpStatus');

/**
 * Custom Application Error class with HTTP status code and details
 */
class ApiError extends Error {
  constructor(statusCode, message, errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = Array.isArray(details) ? details : [details];
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = [], errorCode = ERROR_CODES.BAD_REQUEST) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, errorCode, details);
  }

  static validationError(message, details = []) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static notFound(message = 'Resource not found', details = []) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, ERROR_CODES.NOT_FOUND, details);
  }

  static conflict(message = 'Resource already exists', details = []) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, ERROR_CODES.CONFLICT, details);
  }

  static unprocessableEntity(message, details = []) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, ERROR_CODES.UNPROCESSABLE_ENTITY, details);
  }

  static internal(message = 'Internal server error', details = []) {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, ERROR_CODES.INTERNAL_SERVER_ERROR, details);
  }
}

module.exports = ApiError;
