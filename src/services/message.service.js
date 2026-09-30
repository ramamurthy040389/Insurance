const messageRepository = require('../repositories/message.repository');
const { combineDayAndTime } = require('../utils/dateUtils');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { broadcast } = require('../config/socket');

class MessageService {
  /**
   * Schedule a new message with day and time
   */
  async scheduleMessage({ message, day, time }) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw ApiError.validationError('Validation error', ['Field "message" is required and must be a non-empty string']);
    }

    if (!day || !time) {
      throw ApiError.validationError('Validation error', ['Fields "day" (YYYY-MM-DD) and "time" (HH:mm) are required']);
    }

    const scheduledAt = combineDayAndTime(day, time);
    if (!scheduledAt) {
      throw ApiError.validationError('Invalid date or time format', [
        'Field "day" must be in YYYY-MM-DD format and "time" in HH:mm format'
      ]);
    }

    const newMessage = await messageRepository.createMessage({
      message: message.trim(),
      scheduledAt
    });

    logger.info({
      messageId: newMessage._id,
      scheduledAt: newMessage.scheduledAt
    }, 'New message scheduled successfully');

    // Broadcast real-time event to all connected Socket.IO clients
    broadcast('message_scheduled', {
      id: newMessage._id,
      message: newMessage.message,
      scheduledAt: newMessage.scheduledAt,
      status: newMessage.status,
      createdAt: newMessage.createdAt
    });

    return newMessage;
  }

  /**
   * Worker job execution loop:
   * Periodically claims and processes pending messages using atomic lock
   */
  async processDueMessages() {
    let processedCount = 0;

    // Process all due messages in sequence until no more pending messages
    while (true) {
      const message = await messageRepository.claimNextPendingMessage();
      if (!message) {
        break; // No more due messages
      }

      try {
        logger.info({
          messageId: message._id,
          message: message.message,
          scheduledAt: message.scheduledAt
        }, 'Executing scheduled message dispatch');

        // Demonstrable delivery dispatch (can be extended to email/SMS/Webhook)
        await this.dispatchMessage(message);

        await messageRepository.markCompleted(message._id);
        processedCount++;

        logger.info({ messageId: message._id }, 'Scheduled message marked as COMPLETED');

        // Broadcast real-time execution event to all connected Socket.IO clients
        broadcast('message_dispatched', {
          id: message._id,
          message: message.message,
          scheduledAt: message.scheduledAt,
          status: 'COMPLETED',
          processedAt: new Date()
        });
      } catch (err) {
        logger.error({
          messageId: message._id,
          error: err.message
        }, 'Failed to execute scheduled message');

        await messageRepository.markFailed(message._id, err.message);

        broadcast('message_failed', {
          id: message._id,
          message: message.message,
          error: err.message
        });
      }
    }

    return processedCount;
  }

  /**
   * Simulated delivery dispatcher
   */
  async dispatchMessage(message) {
    // Delivery action demonstration: logs formatted message payload
    // In production, integrate with SendGrid, Twilio, Firebase Cloud Messaging, etc.
    return new Promise((resolve) => setTimeout(resolve, 50));
  }

  /**
   * List scheduled messages with pagination, all=true, date range, and search
   */
  async getMessages(options = {}) {
    const messages = await messageRepository.getMessages(options);
    logger.info({ count: messages.length }, 'Retrieved scheduled messages');
    return messages;
  }
}

module.exports = new MessageService();
