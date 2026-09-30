const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const routes = require('./routes');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const swaggerDocument = require('./docs/swagger.json');

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false // Allow Swagger UI inline scripts
}));

// CORS Configuration
app.use(cors());

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use(requestLogger);

// Global Rate Limiting (exclude in test environment)
if (env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again later.'
      }
    }
  });
  app.use('/api/', limiter);
}

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const path = require('path');

// Root info route
app.get('/', (req, res) => {
  res.json({
    name: 'Insurance Policy Management System API',
    version: '1.0.0',
    docs: '/api-docs',
    health: '/health',
    realtime: '/realtime'
  });
});

// Real-Time Socket.IO Scheduled Messages Dashboard
app.get('/realtime', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'realtime.html'));
});
app.get('/messages-socket', (req, res) => {
  res.redirect('/realtime');
});

// Mount Routes
app.use(routes);

// 404 Route Not Found
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
