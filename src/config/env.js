const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insurance',
  
  // CPU Monitor Config
  CPU_MONITOR_ENABLED: process.env.CPU_MONITOR_ENABLED === 'true',
  CPU_THRESHOLD_PERCENT: parseFloat(process.env.CPU_THRESHOLD_PERCENT || '70'),
  CPU_CHECK_INTERVAL_MS: parseInt(process.env.CPU_CHECK_INTERVAL_MS || '5000', 10),
  CPU_HIGH_USAGE_CONSECUTIVE_CHECKS: parseInt(process.env.CPU_HIGH_USAGE_CONSECUTIVE_CHECKS || '3', 10),

  // Scheduled Message Job Config
  MESSAGE_JOB_ENABLED: process.env.MESSAGE_JOB_ENABLED !== 'false',
  MESSAGE_JOB_INTERVAL_MS: parseInt(process.env.MESSAGE_JOB_INTERVAL_MS || '10000', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),

  // Upload limits
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800', 10) // 50MB
};

module.exports = env;
