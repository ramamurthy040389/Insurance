const mongoose = require('mongoose');
const { MESSAGE_STATUS, ALLOWED_MESSAGE_STATUSES } = require('../constants/messageStatus');

const scheduledMessageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled date and time is required'],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ALLOWED_MESSAGE_STATUSES,
      message: 'Status must be one of: PENDING, PROCESSING, COMPLETED, FAILED'
    },
    default: MESSAGE_STATUS.PENDING,
    index: true
  },
  processedAt: {
    type: Date,
    default: null
  },
  error: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'scheduledmessages'
});

// Compound index for high-efficiency scheduler lock query
scheduledMessageSchema.index({ status: 1, scheduledAt: 1 });

const ScheduledMessage = mongoose.models.ScheduledMessage || mongoose.model('ScheduledMessage', scheduledMessageSchema, 'scheduledmessages');

module.exports = ScheduledMessage;
