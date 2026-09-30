const cpuMonitor = require('../../src/services/cpuMonitor.service');

describe('CPU Monitor Service Unit Tests', () => {
  beforeEach(() => {
    cpuMonitor.consecutiveHighUsageCount = 0;
    cpuMonitor.isShuttingDown = false;
    cpuMonitor.threshold = 70;
    cpuMonitor.requiredConsecutive = 3;
    cpuMonitor.shutdownHandler = jest.fn();
  });

  afterEach(() => {
    cpuMonitor.stop();
  });

  it('should not trigger shutdown if CPU is below threshold', () => {
    const res1 = cpuMonitor.evaluateThreshold(45.5);
    expect(res1.triggered).toBe(false);
    expect(cpuMonitor.consecutiveHighUsageCount).toBe(0);
    expect(cpuMonitor.shutdownHandler).not.toHaveBeenCalled();
  });

  it('should increment consecutive counter on high CPU usage', () => {
    const res1 = cpuMonitor.evaluateThreshold(75.0);
    expect(res1.triggered).toBe(false);
    expect(cpuMonitor.consecutiveHighUsageCount).toBe(1);

    const res2 = cpuMonitor.evaluateThreshold(80.0);
    expect(res2.triggered).toBe(false);
    expect(cpuMonitor.consecutiveHighUsageCount).toBe(2);
    expect(cpuMonitor.shutdownHandler).not.toHaveBeenCalled();
  });

  it('should reset consecutive counter if CPU drops below threshold', () => {
    cpuMonitor.evaluateThreshold(75.0);
    expect(cpuMonitor.consecutiveHighUsageCount).toBe(1);

    // CPU normalizes
    cpuMonitor.evaluateThreshold(50.0);
    expect(cpuMonitor.consecutiveHighUsageCount).toBe(0);
  });

  it('should trigger restart mechanism when sustained threshold is reached', () => {
    cpuMonitor.evaluateThreshold(72.0); // 1
    cpuMonitor.evaluateThreshold(85.0); // 2
    const res3 = cpuMonitor.evaluateThreshold(78.0); // 3 (reaches required consecutive)

    expect(res3.triggered).toBe(true);
    expect(cpuMonitor.isShuttingDown).toBe(true);
    expect(cpuMonitor.shutdownHandler).toHaveBeenCalledWith('HIGH_CPU_THRESHOLD_EXCEEDED');
  });

  it('should not re-trigger restart if already shutting down', () => {
    cpuMonitor.evaluateThreshold(72.0);
    cpuMonitor.evaluateThreshold(85.0);
    cpuMonitor.evaluateThreshold(78.0); // Triggered

    expect(cpuMonitor.shutdownHandler).toHaveBeenCalledTimes(1);

    // 4th spike during shutdown
    const res4 = cpuMonitor.evaluateThreshold(90.0);
    expect(res4.triggered).toBe(false);
    expect(cpuMonitor.shutdownHandler).toHaveBeenCalledTimes(1);
  });
});
