const express = require('express');
const router = express.Router();
const policyRoutes = require('./policy.routes');
const messageRoutes = require('./message.routes');
const mongoose = require('mongoose');

// Health Check Endpoint
router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    memoryUsage: process.memoryUsage()
  });
});

// Mount Resource API Routes
router.use('/api/v1/policies', policyRoutes);
router.use('/api/v1/messages', messageRoutes);

module.exports = router;
