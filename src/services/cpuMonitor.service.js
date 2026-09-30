const os = require('os');
const env = require('../config/env');
const logger = require('../utils/logger');

class CpuMonitorService {
  constructor() {
    this.timer = null;
    this.consecutiveHighUsageCount = 0;
    this.isShuttingDown = false;
    this.shutdownHandler = null;
    this.threshold = env.CPU_THRESHOLD_PERCENT;
    this.requiredConsecutive = env.CPU_HIGH_USAGE_CONSECUTIVE_CHECKS;
    this.checkIntervalMs = env.CPU_CHECK_INTERVAL_MS;
    this.enabled = env.CPU_MONITOR_ENABLED;

    // Baseline counters for native calculation
    this.previousCpuUsage = process.cpuUsage();
    this.previousHrTime = process.hrtime();
  }

  /**
   * Register a graceful shutdown hook provided by server.js
   */
  setShutdownHandler(handler) {
    this.shutdownHandler = handler;
  }

  /**
   * Calculates process CPU utilization percentage using native Node.js process.cpuUsage() & hrtime()
   * Eliminates external OS executable dependencies (e.g. wmic.exe on Windows)
   */
  calculateCpuPercent() {
    const currentUsage = process.cpuUsage(this.previousCpuUsage);
    const currentHrTime = process.hrtime(this.previousHrTime);

    // Convert elapsed real time to microseconds
    const elapsedMicros = currentHrTime[0] * 1e6 + currentHrTime[1] / 1e3;
    // Total CPU time consumed in microseconds (user + system)
    const totalCpuMicros = currentUsage.user + currentUsage.system;

    const numCores = os.cpus().length || 1;

    // CPU percentage normalized across available cores
    const rawPercent = elapsedMicros > 0 ? (totalCpuMicros / (elapsedMicros * numCores)) * 100 : 0;
    const cpuPercent = Math.min(100, Math.max(0, parseFloat(rawPercent.toFixed(2))));

    // Reset baseline for next interval
    this.previousCpuUsage = process.cpuUsage();
    this.previousHrTime = process.hrtime();

    return cpuPercent;
  }

  /**
   * Check CPU utilization of current process
   */
  async checkCpuUsage() {
    try {
      const cpuPercent = this.calculateCpuPercent();
      const mem = process.memoryUsage();
      const memoryMb = (mem.rss / (1024 * 1024)).toFixed(2);

      logger.debug({
        pid: process.pid,
        cpuPercent: `${cpuPercent}%`,
        memoryMb: `${memoryMb} MB`,
        consecutiveHigh: this.consecutiveHighUsageCount
      }, 'CPU and Memory utilization check');

      return this.evaluateThreshold(cpuPercent);
    } catch (err) {
      logger.error({ error: err.message }, 'Error inspecting CPU utilization');
      return { cpuPercent: 0, triggered: false };
    }
  }

  /**
   * Pure evaluation logic for threshold comparison and consecutive spike tracking
   */
  evaluateThreshold(cpuPercent) {
    if (cpuPercent >= this.threshold) {
      this.consecutiveHighUsageCount++;
      logger.warn({
        cpuPercent: `${cpuPercent}%`,
        threshold: `${this.threshold}%`,
        consecutive: this.consecutiveHighUsageCount,
        required: this.requiredConsecutive
      }, 'High CPU utilization detected');

      if (this.consecutiveHighUsageCount >= this.requiredConsecutive && !this.isShuttingDown) {
        this.isShuttingDown = true;
        logger.error({
          cpuPercent: `${cpuPercent}%`,
          consecutiveChecks: this.consecutiveHighUsageCount
        }, 'CRITICAL: Sustained CPU utilization threshold exceeded! Triggering graceful restart.');

        if (typeof this.shutdownHandler === 'function') {
          this.shutdownHandler('HIGH_CPU_THRESHOLD_EXCEEDED');
        }
        return { cpuPercent, triggered: true };
      }
    } else {
      if (this.consecutiveHighUsageCount > 0) {
        logger.info({
          previousHigh: this.consecutiveHighUsageCount,
          currentCpu: `${cpuPercent}%`
        }, 'CPU utilization normalized. Resetting consecutive high usage counter.');
      }
      this.consecutiveHighUsageCount = 0;
    }

    return { cpuPercent, triggered: false };
  }

  /**
   * Start periodic CPU monitor
   */
  start() {
    if (!this.enabled) {
      logger.info('CPU utilization monitoring is disabled by environment configuration');
      return;
    }

    // Initialize baseline
    this.previousCpuUsage = process.cpuUsage();
    this.previousHrTime = process.hrtime();

    logger.info({
      threshold: `${this.threshold}%`,
      intervalMs: this.checkIntervalMs,
      consecutiveChecks: this.requiredConsecutive
    }, 'Starting CPU Utilization Monitor');

    this.timer = setInterval(async () => {
      await this.checkCpuUsage();
    }, this.checkIntervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stop CPU monitor
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('CPU Utilization Monitor stopped');
    }
  }
}

module.exports = new CpuMonitorService();
