const ApiError = require('../utils/apiError');

function validateCreateMessage(req, res, next) {
  const { message, day, time } = req.body || {};
  const errors = [];

  if (!message || typeof message !== 'string' || !message.trim()) {
    errors.push('Field "message" is required and must be a non-empty string');
  }

  if (!day || typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
    errors.push('Field "day" is required and must match format YYYY-MM-DD');
  }

  if (!time || typeof time !== 'string' || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(time.trim())) {
    errors.push('Field "time" is required and must match format HH:mm');
  }

  if (errors.length > 0) {
    return next(ApiError.validationError('Validation error in message payload', errors));
  }

  next();
}

module.exports = {
  validateCreateMessage
};
