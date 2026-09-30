/**
 * String and Data Normalization Utilities
 */

/**
 * Normalizes email by trimming, converting to lower case.
 * Returns null if string is empty or invalid.
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

/**
 * Normalizes phone numbers while preserving standard formatting / digits
 * Doesn't reject valid international or formatted numbers solely due to punctuation
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const str = String(phone).trim();
  if (!str) return null;
  // Keep digits, plus, hyphens, parentheses, spaces
  return str.replace(/[^\d+()\-\s.]/g, '').trim();
}

/**
 * Normalizes and trims general text strings
 */
function sanitizeString(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str.length > 0 ? str : null;
}

/**
 * Parses numeric currency/premium amounts
 */
function parseNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const str = String(val).replace(/[$,\s]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

module.exports = {
  normalizeEmail,
  normalizePhone,
  sanitizeString,
  parseNumber
};
