const policyRepository = require('../repositories/policy.repository');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class PolicyService {
  /**
   * Search policies by username (email or firstName)
   * Supports pagination, date range filtering, and search options
   */
  async searchByUser(username, options = {}) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw ApiError.badRequest('Query parameter "username" is required (email or firstName)');
    }

    const result = await policyRepository.searchByUser(username.trim(), options);
    if (!result) {
      throw ApiError.notFound(`No user or policies found matching '${username}'`);
    }

    return result;
  }

  /**
   * Aggregated policy summary grouped by user
   * Supports pagination, all=true, date range filtering, and search
   */
  async getAggregatedSummary(options = {}) {
    const summary = await policyRepository.getAggregatedSummary(options);
    logger.info({ userCount: summary.length }, 'Aggregated policy summary retrieved');
    return summary;
  }

  /**
   * List all policies with populated relations, pagination, all=true, date range, and search
   */
  async getAllPolicies(options = {}) {
    const policies = await policyRepository.getAllPolicies(options);
    logger.info({ count: policies.length }, 'Retrieved policies list');
    return policies;
  }

  /**
   * Fetch all policy categories with pagination, all=true, date range, and search
   */
  async getAllCategories(options = {}) {
    const categories = await policyRepository.getAllCategories(options);
    logger.info({ count: categories.length }, 'Fetched all policy categories');
    return categories;
  }

  /**
   * Fetch all policy carriers with pagination, all=true, date range, and search
   */
  async getAllCarriers(options = {}) {
    const carriers = await policyRepository.getAllCarriers(options);
    logger.info({ count: carriers.length }, 'Fetched all policy carriers');
    return carriers;
  }
}

module.exports = new PolicyService();
