/**
 * Scheduled Message Status Enumeration
 */
const MESSAGE_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

module.exports = {
  MESSAGE_STATUS,
  ALLOWED_MESSAGE_STATUSES: Object.values(MESSAGE_STATUS)
};
