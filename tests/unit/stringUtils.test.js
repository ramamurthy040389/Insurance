const {
  normalizeEmail,
  normalizePhone,
  sanitizeString,
  parseNumber
} = require('../../src/utils/stringUtils');

describe('String and Number Normalization Unit Tests', () => {
  describe('normalizeEmail', () => {
    it('should trim and lowercase valid emails', () => {
      expect(normalizeEmail('  JOHN.DOE@EXAMPLE.COM ')).toBe('john.doe@example.com');
      expect(normalizeEmail('madler@yahoo.ca')).toBe('madler@yahoo.ca');
    });

    it('should return null for invalid or empty emails', () => {
      expect(normalizeEmail('')).toBeNull();
      expect(normalizeEmail(null)).toBeNull();
      expect(normalizeEmail('invalid-email')).toBeNull();
      expect(normalizeEmail('user@')).toBeNull();
    });
  });

  describe('normalizePhone', () => {
    it('should clean up whitespace and retain digits and standard punctuation', () => {
      expect(normalizePhone(' (867) 735-6559 ')).toBe('(867) 735-6559');
      expect(normalizePhone('+1-800-555-0199')).toBe('+1-800-555-0199');
    });

    it('should return null for empty input', () => {
      expect(normalizePhone('')).toBeNull();
      expect(normalizePhone(null)).toBeNull();
    });
  });

  describe('sanitizeString', () => {
    it('should trim string and return null for empty string', () => {
      expect(sanitizeString('  Active Client  ')).toBe('Active Client');
      expect(sanitizeString('   ')).toBeNull();
      expect(sanitizeString(null)).toBeNull();
    });
  });

  describe('parseNumber', () => {
    it('should parse currency and numeric strings into numbers', () => {
      expect(parseNumber('1180.83')).toBe(1180.83);
      expect(parseNumber('$2,105.90')).toBe(2105.9);
      expect(parseNumber(500)).toBe(500);
    });

    it('should return null for empty or invalid values', () => {
      expect(parseNumber('')).toBeNull();
      expect(parseNumber(null)).toBeNull();
      expect(parseNumber('N/A')).toBeNull();
    });
  });
});
