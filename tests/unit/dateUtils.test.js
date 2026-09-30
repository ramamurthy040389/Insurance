const { parseDate, isDateRangeValid, combineDayAndTime } = require('../../src/utils/dateUtils');

describe('Date Utilities Unit Tests', () => {
  describe('parseDate', () => {
    it('should return null for null, undefined or empty string', () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate('   ')).toBeNull();
    });

    it('should parse ISO date strings', () => {
      const date = parseDate('2018-11-02');
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCFullYear()).toBe(2018);
    });

    it('should parse MM/DD/YYYY format', () => {
      const date = parseDate('11/02/2018');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2018);
    });

    it('should parse Excel numeric serial dates', () => {
      const date = parseDate(43406); // 2018-11-02
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCFullYear()).toBe(2018);
    });

    it('should return null for invalid date string', () => {
      expect(parseDate('invalid-date-string')).toBeNull();
    });
  });

  describe('isDateRangeValid', () => {
    it('should return true when endDate >= startDate', () => {
      expect(isDateRangeValid('2018-01-01', '2019-01-01')).toBe(true);
      expect(isDateRangeValid('2018-01-01', '2018-01-01')).toBe(true);
    });

    it('should return false when endDate < startDate', () => {
      expect(isDateRangeValid('2019-01-01', '2018-01-01')).toBe(false);
    });

    it('should return false if either date is missing or invalid', () => {
      expect(isDateRangeValid(null, '2019-01-01')).toBe(false);
      expect(isDateRangeValid('2018-01-01', 'invalid')).toBe(false);
    });
  });

  describe('combineDayAndTime', () => {
    it('should combine YYYY-MM-DD and HH:mm into valid Date object', () => {
      const combined = combineDayAndTime('2026-10-05', '10:30');
      expect(combined).toBeInstanceOf(Date);
      expect(combined.getFullYear()).toBe(2026);
      expect(combined.getMonth()).toBe(9); // 0-indexed month for Oct is 9
      expect(combined.getDate()).toBe(5);
    });

    it('should return null for invalid day format', () => {
      expect(combineDayAndTime('05-10-2026', '10:30')).toBeNull();
      expect(combineDayAndTime('invalid', '10:30')).toBeNull();
    });

    it('should return null for invalid time format', () => {
      expect(combineDayAndTime('2026-10-05', '25:00')).toBeNull();
      expect(combineDayAndTime('2026-10-05', 'invalid')).toBeNull();
    });
  });
});
