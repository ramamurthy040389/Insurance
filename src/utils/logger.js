const pino = require('pino');
const env = require('../config/env');

const isProduction = env.NODE_ENV === 'production';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname'
        }
      },
  base: {
    service: 'insurance-policy-service',
    env: env.NODE_ENV
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'apiKey',
      'secret'
    ],
    censor: '[REDACTED]'
  }
});

module.exports = logger;
