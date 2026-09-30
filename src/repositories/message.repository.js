const { ScheduledMessage } = require('../models');
const { MESSAGE_STATUS } = require('../constants/messageStatus');

class MessageRepository {
  /**
   * Create a new scheduled message document
   */
  async createMessage({ message, scheduledAt }) {
    return await ScheduledMessage.create({
      message,
      scheduledAt,
      status: MESSAGE_STATUS.PENDING
    });
  }

  /**
   * Atomically claims the next pending message due for execution
   * Prevents race conditions and duplicate processing across concurrent workers
   */
  async claimNextPendingMessage(now = new Date()) {
    return await ScheduledMessage.findOneAndUpdate(
      {
        status: MESSAGE_STATUS.PENDING,
        scheduledAt: { $lte: now }
      },
      {
        $set: {
          status: MESSAGE_STATUS.PROCESSING
        }
      },
      {
        sort: { scheduledAt: 1 },
        new: true
      }
    );
  }

  /**
   * Mark message as COMPLETED
   */
  async markCompleted(id) {
    return await ScheduledMessage.findByIdAndUpdate(
      id,
      {
        $set: {
          status: MESSAGE_STATUS.COMPLETED,
          processedAt: new Date()
        }
      },
      { new: true }
    );
  }

  /**
   * Mark message as FAILED with error message
   */
  async markFailed(id, errorMessage) {
    return await ScheduledMessage.findByIdAndUpdate(
      id,
      {
        $set: {
          status: MESSAGE_STATUS.FAILED,
          processedAt: new Date(),
          error: errorMessage || 'Unknown processing error'
        }
      },
      { new: true }
    );
  }

  /**
   * Get message by ID
   */
  async getById(id) {
    return await ScheduledMessage.findById(id).lean();
  }

  /**
   * Fetch scheduled messages with pagination, all=true, date range, and search
   */
  async getMessages(options = {}) {
    const {
      parsePaginationParams,
      buildPaginationMetadata,
      parseDateRangeFilter,
      parseSearchFilter
    } = require('../utils/queryUtils');

    const pagination = parsePaginationParams(options);
    const dateRange = parseDateRangeFilter(options, 'scheduledAt');
    const searchFilter = parseSearchFilter(options, ['message', 'status', 'error']);

    const filter = { ...dateRange.filter };
    if (searchFilter.hasSearch) {
      Object.assign(filter, searchFilter.filter);
    }
    if (options.status) {
      filter.status = options.status.toUpperCase();
    }

    const total = await ScheduledMessage.countDocuments(filter);

    let query = ScheduledMessage.find(filter).sort({ scheduledAt: -1 });
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

module.exports = new MessageRepository();
