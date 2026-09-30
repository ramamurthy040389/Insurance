const { Policy, User, PolicyCategory, PolicyCarrier } = require('../models');
const mongoose = require('mongoose');
const {
  parsePaginationParams,
  buildPaginationMetadata,
  parseDateRangeFilter,
  parseSearchFilter
} = require('../utils/queryUtils');

class PolicyRepository {
  /**
   * Search policies by username (email or firstName)
   * Supports pagination, date range filtering, and keyword search
   */
  async searchByUser(searchTerm, options = {}) {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return null;
    }

    const trimmed = searchTerm.trim();
    const normalizedEmail = trimmed.toLowerCase();

    // 1. Find the target user by email (exact match) or firstName (flexible case-insensitive match)
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { firstName: { $regex: new RegExp(trimmed, 'i') } }
      ]
    }).lean();

    if (!user) {
      return null;
    }

    const pagination = parsePaginationParams(options);
    const dateRange = parseDateRangeFilter(options, 'policyStartDate');
    const searchFilter = parseSearchFilter(options, ['policyNumber', 'policyType', 'policyMode', 'producer', 'csr']);

    // Build base policy match filter
    const policyMatch = { userId: user._id };

    // Apply date range filter (policyStartDate between dates)
    if (dateRange.hasDateFilter) {
      Object.assign(policyMatch, dateRange.filter);
    }

    // Apply search filter
    if (searchFilter.hasSearch) {
      Object.assign(policyMatch, searchFilter.filter);
    }

    // 2. Fetch all policies for the user using aggregation with $lookup and $facet for pagination
    const facetDataPipeline = [
      {
        $lookup: {
          from: 'accounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'account'
        }
      },
      {
        $unwind: {
          path: '$account',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'policycarriers',
          localField: 'companyId',
          foreignField: '_id',
          as: 'carrier'
        }
      },
      {
        $unwind: {
          path: '$carrier',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'policycategories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'agents',
          localField: 'agentId',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $unwind: {
          path: '$agent',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          policyNumber: '$policyNumber',
          policyStartDate: {
            $dateToString: { format: '%Y-%m-%d', date: '$policyStartDate' }
          },
          policyEndDate: {
            $dateToString: { format: '%Y-%m-%d', date: '$policyEndDate' }
          },
          policyType: '$policyType',
          policyMode: '$policyMode',
          premiumAmount: '$premiumAmount',
          premiumAmountWritten: '$premiumAmountWritten',
          producer: '$producer',
          csr: '$csr',
          account: {
            id: '$account._id',
            name: '$account.accountName',
            type: '$account.accountType'
          },
          carrier: {
            id: '$carrier._id',
            name: '$carrier.companyName'
          },
          category: {
            id: '$category._id',
            name: '$category.categoryName'
          },
          agent: {
            id: '$agent._id',
            name: '$agent.agent_name'
          }
        }
      },
      {
        $sort: { policyStartDate: -1 }
      }
    ];

    if (!pagination.all) {
      if (pagination.skip > 0) facetDataPipeline.push({ $skip: pagination.skip });
      if (pagination.limit > 0) facetDataPipeline.push({ $limit: pagination.limit });
    }

    const aggregateResult = await Policy.aggregate([
      { $match: policyMatch },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: facetDataPipeline
        }
      }
    ]);

    const total = aggregateResult[0]?.metadata[0]?.total || 0;
    const policies = aggregateResult[0]?.data || [];

    const paginationMeta = buildPaginationMetadata(total, pagination.page, pagination.limit, pagination.all);
    policies.pagination = paginationMeta;

    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        email: user.email,
        phone: user.phone,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        userType: user.userType
      },
      policies,
      pagination: paginationMeta
    };
  }

  /**
   * Aggregated policy summary grouped by user
   * Supports pagination, date range filtering, and search operations
   */
  async getAggregatedSummary(options = {}) {
    const pagination = parsePaginationParams(options);
    const dateRange = parseDateRangeFilter(options, 'policyStartDate');
    const searchFilter = parseSearchFilter(options, ['firstName', 'email', 'categories', 'carriers']);

    const preMatch = {};
    if (dateRange.hasDateFilter) {
      Object.assign(preMatch, dateRange.filter);
    }

    const pipeline = [];
    if (Object.keys(preMatch).length > 0) {
      pipeline.push({ $match: preMatch });
    }

    pipeline.push(
      {
        $group: {
          _id: '$userId',
          totalPolicies: { $sum: 1 },
          categoryIds: { $addToSet: '$categoryId' },
          companyIds: { $addToSet: '$companyId' },
          firstPolicyStartDate: { $min: '$policyStartDate' },
          lastPolicyEndDate: { $max: '$policyEndDate' },
          totalPremium: { $sum: { $ifNull: ['$premiumAmount', 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'policycategories',
          localField: 'categoryIds',
          foreignField: '_id',
          as: 'categories'
        }
      },
      {
        $lookup: {
          from: 'policycarriers',
          localField: 'companyIds',
          foreignField: '_id',
          as: 'carriers'
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          firstName: '$user.firstName',
          email: '$user.email',
          totalPolicies: 1,
          categories: {
            $map: {
              input: '$categories',
              as: 'cat',
              in: '$$cat.categoryName'
            }
          },
          carriers: {
            $map: {
              input: '$carriers',
              as: 'car',
              in: '$$car.companyName'
            }
          },
          firstPolicyStartDate: {
            $dateToString: { format: '%Y-%m-%d', date: '$firstPolicyStartDate' }
          },
          lastPolicyEndDate: {
            $dateToString: { format: '%Y-%m-%d', date: '$lastPolicyEndDate' }
          },
          totalPremium: { $round: ['$totalPremium', 2] }
        }
      }
    );

    // Apply post-lookup search
    if (searchFilter.hasSearch) {
      pipeline.push({ $match: searchFilter.filter });
    }

    pipeline.push({
      $sort: { totalPolicies: -1, firstName: 1 }
    });

    const facetDataPipeline = [];
    if (!pagination.all) {
      if (pagination.skip > 0) facetDataPipeline.push({ $skip: pagination.skip });
      if (pagination.limit > 0) facetDataPipeline.push({ $limit: pagination.limit });
    }

    const facetResult = await Policy.aggregate([
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: facetDataPipeline
        }
      }
    ]);

    const total = facetResult[0]?.metadata[0]?.total || 0;
    const data = facetResult[0]?.data || [];

    const paginationMeta = buildPaginationMetadata(total, pagination.page, pagination.limit, pagination.all);
    data.pagination = paginationMeta;

    return data;
  }

  /**
   * List all policies with populated references
   * Supports pagination, all=true, date range, and search
   */
  async getAllPolicies(options = {}) {
    const pagination = parsePaginationParams(options);
    const dateRange = parseDateRangeFilter(options, 'policyStartDate');
    const searchFilter = parseSearchFilter(options, [
      'policyNumber',
      'policyType',
      'policyMode',
      'producer',
      'csr'
    ]);

    const filter = {};
    if (dateRange.hasDateFilter) {
      Object.assign(filter, dateRange.filter);
    }

    if (searchFilter.hasSearch) {
      Object.assign(filter, searchFilter.filter);
    }

    const total = await Policy.countDocuments(filter);

    let query = Policy.find(filter)
      .populate('userId', 'firstName email phone city state zipCode userType')
      .populate('accountId', 'accountName accountType')
      .populate('categoryId', 'categoryName')
      .populate('companyId', 'companyName')
      .populate('agentId', 'agent_name')
      .sort({ policyStartDate: -1 });

    if (!pagination.all) {
      if (pagination.skip > 0) query = query.skip(pagination.skip);
      if (pagination.limit > 0) query = query.limit(pagination.limit);
    }

    const data = await query.lean();
    const paginationMeta = buildPaginationMetadata(total, pagination.page, pagination.limit, pagination.all);
    data.pagination = paginationMeta;

    return data;
  }

  /**
   * Fetch all policy categories with pagination, all=true, date filter, and search
   */
  async getAllCategories(options = {}) {
    const pagination = parsePaginationParams(options);
    const dateRange = parseDateRangeFilter(options, 'createdAt');
    const searchFilter = parseSearchFilter(options, ['categoryName']);

    const filter = { ...dateRange.filter };
    if (searchFilter.hasSearch) {
      Object.assign(filter, searchFilter.filter);
    }

    const total = await PolicyCategory.countDocuments(filter);

    let query = PolicyCategory.find(filter).sort({ categoryName: 1 });
    if (!pagination.all) {
      if (pagination.skip > 0) query = query.skip(pagination.skip);
      if (pagination.limit > 0) query = query.limit(pagination.limit);
    }

    const data = await query.lean();
    const paginationMeta = buildPaginationMetadata(total, pagination.page, pagination.limit, pagination.all);
    data.pagination = paginationMeta;

    return data;
  }

  /**
   * Fetch all policy carriers with pagination, all=true, date filter, and search
   */
  async getAllCarriers(options = {}) {
    const pagination = parsePaginationParams(options);
    const dateRange = parseDateRangeFilter(options, 'createdAt');
    const searchFilter = parseSearchFilter(options, ['companyName']);

    const filter = { ...dateRange.filter };
    if (searchFilter.hasSearch) {
      Object.assign(filter, searchFilter.filter);
    }

    const total = await PolicyCarrier.countDocuments(filter);

    let query = PolicyCarrier.find(filter).sort({ companyName: 1 });
    if (!pagination.all) {
      if (pagination.skip > 0) query = query.skip(pagination.skip);
      if (pagination.limit > 0) query = query.limit(pagination.limit);
    }

    const data = await query.lean();
    const paginationMeta = buildPaginationMetadata(total, pagination.page, pagination.limit, pagination.all);
    data.pagination = paginationMeta;

    return data;
  }
}

module.exports = new PolicyRepository();
