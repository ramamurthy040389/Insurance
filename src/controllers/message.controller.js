const messageService = require('../services/message.service');
const ApiResponse = require('../utils/apiResponse');

class MessageController {
  /**
   * POST /api/v1/messages
   */
  async createMessage(req, res, next) {
    try {
      const { message, day, time } = req.body;
      const scheduledMessage = await messageService.scheduleMessage({ message, day, time });

      return ApiResponse.created(res, {
        id: scheduledMessage._id,
        message: scheduledMessage.message,
        scheduledAt: scheduledMessage.scheduledAt,
        status: scheduledMessage.status,
        createdAt: scheduledMessage.createdAt
      }, 'Message scheduled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/messages
   */
  async getMessages(req, res, next) {
    try {
      const result = await messageService.getMessages(req.query);
      return ApiResponse.success(res, {
        count: result.length,
        messages: result,
        data: result,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();
