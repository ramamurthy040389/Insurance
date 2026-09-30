const { parseDate } = require('./dateUtils');

/**
 * Standard query parser for pagination parameters
 * Supports 'all=true' or 'all=1' to bypass pagination and fetch all records
 */
function parsePaginationParams(query, defaultLimit = 10) {
  const isAll = query.all === 'true' || query.all === '1' || query.all === true;

  let page = 1;
  if (query.page !== undefined) {
    const parsedPage = parseInt(query.page, 10);
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }

  let limit = defaultLimit;
  if (query.limit !== undefined) {
    const parsedLimit = parseInt(query.limit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = parsedLimit;
    }
  }

  const skip = isAll ? 0 : (page - 1) * limit;

  return {
    all: isAll,
    page: isAll ? 1 : page,
    limit: isAll ? 0 : limit,
    skip
  };
}

/**
 * Builds standard pagination response metadata
 */
function buildPaginationMetadata(total, page, limit, isAll) {
  if (isAll) {
    return {
      total,
      all: true
    };
  }

  const totalPages = limit > 0 ? Math.ceil(total / limit) : (total > 0 ? 1 : 0);

  return {
    total,
    page,
    limit,
    totalPages: totalPages === 0 ? 0 : totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    all: false
  };
}

/**
 * Parses date range query parameters (startDate, endDate, start_date, end_date, from, to)
 */
function parseDateRangeFilter(query, dateField = 'createdAt') {
  const rawStart = query.startDate || query.start_date || query.from;
  const rawEnd = query.endDate || query.end_date || query.to;

  const start = parseDate(rawStart);
  const end = parseDate(rawEnd);

  const filter = {};
  if (start && end) {
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    filter[dateField] = { $gte: start, $lte: endOfDay };
  } else if (start) {
    filter[dateField] = { $gte: start };
  } else if (end) {
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    filter[dateField] = { $lte: endOfDay };
  }

  return {
    filter,
    start,
    end,
    hasDateFilter: Boolean(start || end)
  };
}

/**
 * Parses a search term across multiple string fields using case-insensitive regex
 */
function parseSearchFilter(query, fields = []) {
  const term = query.search || query.q || query.keyword;
  if (!term || typeof term !== 'string' || !term.trim()) {
    return { filter: {}, term: '', hasSearch: false };
  }

  const trimmed = term.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  if (fields.length === 1) {
    return {
      filter: { [fields[0]]: regex },
      term: trimmed,
      hasSearch: true
    };
  }

  return {
    filter: {
      $or: fields.map((f) => ({ [f]: regex }))
    },
    term: trimmed,
    hasSearch: true
  };
}

module.exports = {
  parsePaginationParams,
  buildPaginationMetadata,
  parseDateRangeFilter,
  parseSearchFilter
};
