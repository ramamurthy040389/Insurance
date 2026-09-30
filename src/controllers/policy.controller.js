const importService = require('../services/import.service');
const policyService = require('../services/policy.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

class PolicyController {
  /**
   * POST /api/v1/policies/import
   * Offloads file parsing and import to Worker Thread
   */
  async importPolicies(req, res, next) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('Please attach a CSV or XLSX file with field name "file"');
      }

      const result = await importService.processFileInWorker(req.file);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/policies/check-duplicates
   * Inspects a CSV / XLSX file for duplicate records against database without mutating data
   */
  async checkDuplicates(req, res, next) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('Please attach a CSV or XLSX file with field name "file"');
      }

      const result = await importService.processFileInWorker(req.file, { checkOnly: true });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/policies
   * List all policies with pagination, all=true, date range filtering, and keyword search
   */
  async getPolicies(req, res, next) {
    try {
      const result = await policyService.getAllPolicies(req.query);
      return ApiResponse.success(res, {
        count: result.length,
        policies: result,
        data: result,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/policies/search?username=<username>
   * Search policies by user with pagination, all=true, date filtering, and keyword search
   */
  async searchByUser(req, res, next) {
    try {
      const { username } = req.query;
      const data = await policyService.searchByUser(username, req.query);
      return ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/policies/summary
   * Aggregated policy summary grouped by user with pagination, all=true, date filtering, and search
   */
  async getSummary(req, res, next) {
    try {
      const summary = await policyService.getAggregatedSummary(req.query);
      return ApiResponse.success(res, {
        data: summary,
        pagination: summary.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/policies/categories
   * List policy categories with pagination, all=true, date filtering, and search
   */
  async getCategories(req, res, next) {
    try {
      const categories = await policyService.getAllCategories(req.query);
      return ApiResponse.success(res, {
        count: categories.length,
        categories,
        data: categories,
        pagination: categories.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/policies/carriers
   * List policy carriers with pagination, all=true, date filtering, and search
   */
  async getCarriers(req, res, next) {
    try {
      const carriers = await policyService.getAllCarriers(req.query);
      return ApiResponse.success(res, {
        count: carriers.length,
        carriers,
        data: carriers,
        pagination: carriers.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PolicyController();
