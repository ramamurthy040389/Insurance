const cpuMonitorService = require('../services/cpuMonitor.service');

function startCpuMonitorJob(shutdownHandler) {
  if (shutdownHandler) {
    cpuMonitorService.setShutdownHandler(shutdownHandler);
  }
  cpuMonitorService.start();
}

function stopCpuMonitorJob() {
  cpuMonitorService.stop();
}

module.exports = {
  startCpuMonitorJob,
  stopCpuMonitorJob
};
