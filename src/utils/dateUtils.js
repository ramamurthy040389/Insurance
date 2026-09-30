/**
 * Robust Date Utilities for parsing, normalization, and validation
 */

/**
 * Normalizes input into a valid Date object or null
 * Handles ISO strings, YYYY-MM-DD, MM/DD/YYYY, Excel integer serial dates
 */
function parseDate(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  // Handle Excel Serial Date numbers (e.g. 43406 -> 2018-11-02)
  if (typeof val === 'number') {
    // Excel epoch begins Dec 30, 1899 due to 1900 leap year bug
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = val * 86400000;
    const d = new Date(excelEpoch.getTime() + ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Check if numeric string representation of an excel date
    if (/^\d{5}$/.test(trimmed)) {
      return parseDate(parseInt(trimmed, 10));
    }

    // Try standard ISO parsing (e.g. 2018-11-02 or 2018-11-02T00:00:00.000Z)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // Try MM/DD/YYYY or DD-MM-YYYY
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      // YYYY-MM-DD or YYYY/MM/DD
      if (parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) return d;
      }

      // Ends with 4-digit year: XX-XX-YYYY or XX/XX/YYYY
      if (parts[2].length === 4) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        // If p0 > 12, p0 is definitely the day (DD-MM-YYYY)
        if (p0 > 12 && p1 <= 12) {
          const d = new Date(year, p1 - 1, p0);
          if (!isNaN(d.getTime())) return d;
        }

        // If p1 > 12, p1 is definitely the day (MM-DD-YYYY)
        if (p1 > 12 && p0 <= 12) {
          const d = new Date(year, p0 - 1, p1);
          if (!isNaN(d.getTime())) return d;
        }

        // If both <= 12:
        // Slashes (e.g. 11/02/2018) typically denote MM/DD/YYYY in US insurance sheets
        if (trimmed.includes('/')) {
          const d = new Date(year, p0 - 1, p1);
          if (!isNaN(d.getTime())) return d;
        } else {
          // Hyphenated (e.g. 02-11-2018) denotes DD-MM-YYYY
          const d = new Date(year, p1 - 1, p0);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }

    // Fallback to Date.parse
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }
  }

  return null;
}

/**
 * Validates that policy end date is >= policy start date
 */
function isDateRangeValid(startDate, endDate) {
  if (!startDate || !endDate) return false;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return false;
  return end.getTime() >= start.getTime();
}

/**
 * Combines day ('YYYY-MM-DD') and time ('HH:mm') into a unified Date
 * Defaults to system/UTC timezone according to requirement
 */
function combineDayAndTime(dayStr, timeStr) {
  if (!dayStr || !timeStr) return null;
  const day = dayStr.trim();
  const time = timeStr.trim();

  // Validate day format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  // Validate time format HH:mm or HH:mm:ss
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) return null;

  const isoString = `${day}T${time.length === 5 ? time + ':00' : time}`;
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = {
  parseDate,
  isDateRangeValid,
  combineDayAndTime
};
