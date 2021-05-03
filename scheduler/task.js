class Task {
  constructor(taskId, nodeSelector, { cpuId = null, phaseId = null, predecessor, scheduleStartTime = null, scheduleEndTime = null }) {
    this.id = taskId;
    this.pred = predecessor;
    
    this.phaseId = phaseId;
    this.cpuId = cpuId;

    this.nodeSelector = nodeSelector;
    this.hasCompleted = false;
    
    this.actualStartTime = null;
    this.actualEndTime = null;

    this.scheduleStartTime = scheduleStartTime;
    this.scheduleEndTime = scheduleEndTime;
  }

  isCompleted() {
    return this.hasCompleted;
  }

  isReady() {
    // console.log('DEBUG taskId', this.id, 'pred', this.pred)
    if (this.pred) return this.pred.isCompleted();

    return true;
  }

  getCpuId() {
    return this.cpuId;
  }

  getNodeSelector() {
    this.startTime = Date.now();
    return this.nodeSelector;
  }

  getPredecessor() {
    return this.pred;
  }

  setCompleted() {
    this.hasCompleted = true;
    this.endTime = Date.now();
  }
};

module.exports = Task;