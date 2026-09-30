const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

/**
 * Initializes Socket.IO with HTTP server and registers real-time events
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  logger.info('Socket.IO initialized successfully');

  io.on('connection', async (socket) => {
    logger.info({ socketId: socket.id }, 'Socket.IO client connected');

    // Emit connection welcome event
    socket.emit('connected', {
      success: true,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      message: 'Connected to Insurance Policy Management Real-time Service'
    });

    // 1. Immediately register event listeners synchronously to avoid race conditions with incoming events
    // Client requests current messages list via socket
    socket.on('get_messages', async (data = {}, callback) => {
      try {
        const messageService = require('../services/message.service');
        const result = await messageService.getMessages(data);
        const response = {
          success: true,
          count: result.length,
          messages: result,
          pagination: result.pagination
        };
        if (typeof callback === 'function') {
          callback(response);
        } else {
          socket.emit('messages_list', response);
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        } else {
          socket.emit('messages_error', { error: err.message });
        }
      }
    });

    // Client schedules a new message directly via Socket.IO
    socket.on('schedule_message', async (data = {}, callback) => {
      try {
        const messageService = require('../services/message.service');
        const newMessage = await messageService.scheduleMessage(data);

        const response = {
          success: true,
          message: 'Message scheduled successfully via Socket.IO',
          data: newMessage
        };

        if (typeof callback === 'function') {
          callback(response);
        }
      } catch (err) {
        const errResponse = {
          success: false,
          error: err.message,
          details: err.details || []
        };
        if (typeof callback === 'function') {
          callback(errResponse);
        } else {
          socket.emit('schedule_error', errResponse);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket.IO client disconnected');
    });

    // 2. Asynchronously fetch and emit initial scheduled messages without delaying listener registration
    (async () => {
      try {
        const ScheduledMessage = require('../models/ScheduledMessage');
        const messages = await ScheduledMessage.find({})
          .sort({ scheduledAt: -1 })
          .limit(50)
          .lean();

        const total = await ScheduledMessage.countDocuments();
        const pendingCount = await ScheduledMessage.countDocuments({ status: 'PENDING' });
        const completedCount = await ScheduledMessage.countDocuments({ status: 'COMPLETED' });

        const limit = 50;
        const totalPages = limit > 0 ? Math.ceil(total / limit) : (total > 0 ? 1 : 0);

        socket.emit('scheduled_messages_initial', {
          success: true,
          stats: {
            total,
            pending: pendingCount,
            completed: completedCount
          },
          count: messages.length,
          messages,
          pagination: {
            total,
            page: 1,
            limit,
            totalPages: totalPages === 0 ? 0 : totalPages,
            hasNextPage: total > limit,
            hasPrevPage: false,
            all: false
          }
        });
      } catch (err) {
        logger.error({ error: err.message }, 'Failed to emit initial messages to socket client');
      }
    })();
  });

  return io;
}

/**
 * Returns the active Socket.IO server instance
 */
function getIO() {
  return io;
}

/**
 * Broadcasts an event to all connected Socket.IO clients
 */
function broadcast(event, payload) {
  if (io) {
    io.emit(event, payload);
    logger.debug({ event }, 'Socket.IO broadcast event emitted');
  }
}

/**
 * Closes the Socket.IO server
 */
function closeSocket() {
  if (io) {
    io.close();
    io = null;
    logger.info('Socket.IO server closed');
  }
}

module.exports = {
  initSocket,
  getIO,
  broadcast,
  closeSocket
};
