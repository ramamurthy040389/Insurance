const ApiError = require('../utils/apiError');

function validateSearchQuery(req, res, next) {
  const { username } = req.query;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return next(ApiError.badRequest('Query parameter "username" is required and cannot be empty'));
  }
  next();
}

function validateSummaryQuery(req, res, next) {
  const { limit, page } = req.query;
  if (limit !== undefined && (isNaN(parseInt(limit, 10)) || parseInt(limit, 10) <= 0)) {
    return next(ApiError.badRequest('Query parameter "limit" must be a positive integer'));
  }
  if (page !== undefined && (isNaN(parseInt(page, 10)) || parseInt(page, 10) <= 0)) {
    return next(ApiError.badRequest('Query parameter "page" must be a positive integer'));
  }
  next();
}

module.exports = {
  validateSearchQuery,
  validateSummaryQuery
};
