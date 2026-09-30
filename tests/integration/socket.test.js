const http = require('http');
const ioClient = require('socket.io-client');
const app = require('../../src/app');
const { initSocket, closeSocket } = require('../../src/config/socket');
const { ScheduledMessage } = require('../../src/models');

describe('Socket.IO Real-Time Scheduled Messages Integration Tests', () => {
  let httpServer;
  let clientSocket;
  let port;

  beforeAll((done) => {
    httpServer = http.createServer(app);
    initSocket(httpServer);
    httpServer.listen(() => {
      port = httpServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    closeSocket();
    httpServer.close(done);
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
      clientSocket = null;
    }
  });

  const connectClient = () => {
    return new Promise((resolve) => {
      const socket = ioClient(`http://localhost:${port}`, {
        forceNew: true,
        transports: ['websocket']
      });
      if (socket.connected) {
        resolve(socket);
      } else {
        socket.once('connect', () => resolve(socket));
      }
    });
  };

  it('should connect to Socket.IO and receive welcome connected event', (done) => {
    clientSocket = ioClient(`http://localhost:${port}`, { forceNew: true, transports: ['websocket'] });

    clientSocket.on('connected', (data) => {
      expect(data.success).toBe(true);
      expect(data.socketId).toBeDefined();
      expect(data.message).toContain('Real-time Service');
      done();
    });
  });

  it('should receive scheduled_messages_initial on connection so client is never empty', async () => {
    // Seed at least one message
    await ScheduledMessage.create({
      message: 'Test initial sync message',
      scheduledAt: new Date(Date.now() + 60000),
      status: 'PENDING'
    });

    return new Promise((resolve) => {
      clientSocket = ioClient(`http://localhost:${port}`, { forceNew: true, transports: ['websocket'] });

      clientSocket.on('scheduled_messages_initial', (data) => {
        expect(data.success).toBe(true);
        expect(data.count).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(data.messages)).toBe(true);
        expect(data.stats).toBeDefined();
        expect(data.stats.total).toBeGreaterThanOrEqual(1);
        resolve();
      });
    });
  });

  it('should schedule a message via Socket.IO schedule_message event and receive broadcast', async () => {
    clientSocket = await connectClient();

    return new Promise((resolve) => {
      clientSocket.on('message_scheduled', (broadcastData) => {
        expect(broadcastData.message).toBe('Socket.IO real-time notification test');
        expect(broadcastData.status).toBe('PENDING');
        expect(broadcastData.scheduledAt).toBeDefined();
        resolve();
      });

      clientSocket.emit('schedule_message', {
        message: 'Socket.IO real-time notification test',
        day: '2026-11-20',
        time: '15:30'
      }, (ack) => {
        expect(ack.success).toBe(true);
        expect(ack.data.message).toBe('Socket.IO real-time notification test');
      });
    });
  });

  it('should fetch messages list via get_messages Socket.IO event with pagination', async () => {
    clientSocket = await connectClient();

    return new Promise((resolve) => {
      clientSocket.emit('get_messages', { page: 1, limit: 5 }, (response) => {
        expect(response.success).toBe(true);
        expect(response.messages).toBeDefined();
        expect(response.pagination).toBeDefined();
        expect(response.pagination.limit).toBe(5);
        resolve();
      });
    });
  });
});
