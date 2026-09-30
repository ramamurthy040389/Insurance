const request = require('supertest');
const app = require('../../src/app');
const { ScheduledMessage } = require('../../src/models');
const messageService = require('../../src/services/message.service');
const { MESSAGE_STATUS } = require('../../src/constants/messageStatus');

describe('Scheduled Messages Integration Tests', () => {
  describe('POST /api/v1/messages', () => {
    it('should create a scheduled message with valid payload', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .send({
          message: 'Policy renewal reminder',
          day: '2026-10-05',
          time: '10:30'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.message).toBe('Policy renewal reminder');
      expect(res.body.data.status).toBe(MESSAGE_STATUS.PENDING);
      expect(new Date(res.body.data.scheduledAt)).toBeInstanceOf(Date);

      // Verify in MongoDB
      const saved = await ScheduledMessage.findById(res.body.data.id);
      expect(saved).not.toBeNull();
      expect(saved.message).toBe('Policy renewal reminder');
    });

    it('should reject requests with missing message body', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .send({
          day: '2026-10-05',
          time: '10:30'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject requests with invalid day format', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .send({
          message: 'Test Reminder',
          day: '05-10-2026',
          time: '10:30'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject requests with invalid time format', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .send({
          message: 'Test Reminder',
          day: '2026-10-05',
          time: '25:99'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Scheduled Message Worker Execution & Concurrency', () => {
    it('should process due pending messages and mark them COMPLETED', async () => {
      // Create a due message (scheduled in past)
      const pastDate = new Date(Date.now() - 60000);
      const dueMessage = await ScheduledMessage.create({
        message: 'Immediate task',
        scheduledAt: pastDate,
        status: MESSAGE_STATUS.PENDING
      });

      // Create a future message (should not be processed)
      const futureDate = new Date(Date.now() + 3600000);
      const futureMessage = await ScheduledMessage.create({
        message: 'Future task',
        scheduledAt: futureDate,
        status: MESSAGE_STATUS.PENDING
      });

      const processedCount = await messageService.processDueMessages();
      expect(processedCount).toBe(1);

      // Verify due message is COMPLETED
      const updatedDue = await ScheduledMessage.findById(dueMessage._id);
      expect(updatedDue.status).toBe(MESSAGE_STATUS.COMPLETED);
      expect(updatedDue.processedAt).toBeInstanceOf(Date);

      // Verify future message remains PENDING
      const updatedFuture = await ScheduledMessage.findById(futureMessage._id);
      expect(updatedFuture.status).toBe(MESSAGE_STATUS.PENDING);
    });

    it('should prevent race conditions and duplicate processing across concurrent workers', async () => {
      // Create single due message
      const dueMessage = await ScheduledMessage.create({
        message: 'Concurrent lock test',
        scheduledAt: new Date(Date.now() - 5000),
        status: MESSAGE_STATUS.PENDING
      });

      // Run 3 concurrent process calls simultaneously
      const results = await Promise.all([
        messageService.processDueMessages(),
        messageService.processDueMessages(),
        messageService.processDueMessages()
      ]);

      const totalProcessed = results.reduce((acc, count) => acc + count, 0);
      expect(totalProcessed).toBe(1); // Only 1 worker should have claimed and processed it!

      const check = await ScheduledMessage.findById(dueMessage._id);
      expect(check.status).toBe(MESSAGE_STATUS.COMPLETED);
    });
  });
});
