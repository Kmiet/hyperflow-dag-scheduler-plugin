class Task {
  constructor(taskId, nodeSelector, { cpuId = null, phaseId = null, predecessor, scheduleStartTime = null, scheduleEndTime = null }) {
    this.id = taskId;
    this.pred = predecessor;
    
    this.operationName = null;

    this.phaseId = phaseId;
    this.cpuId = cpuId;

    this.nodeSelector = nodeSelector;
    this.hasCompleted = false;
    
    this.actualStartTime = null;
    this.actualEndTime = null;

    // Is waiting for allocation
    this.startWaitingTime = null;

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

  isSameOrEarlierPhase(otherTask) {
    return !(this.phaseId > otherTask.phaseId);
  }

  isSameOperation(otherTask) {
    // 2nd approach -> based off function name
    // console.log("[CompareOpNames]", this.operationName, otherTask.operationName, this.operationName === otherTask.operationName);
    return this.operationName === otherTask.operationName;
  }

  getCpuId() {
    return this.cpuId;
  }

  getNodeSelector() {
    if (!this.actualStartTime) {
      this.actualStartTime = Date.now();
    }
    return this.nodeSelector;
  }

  getPredecessor() {
    return this.pred;
  }

  setCompleted() {
    this.hasCompleted = true;
    this.actualEndTime = Date.now();
  }

  setBeginWaitTime() {
    if (!this.startWaitingTime) {
      this.startWaitingTime = Date.now();
    }
  }

  setOperationName(name) {
    this.operationName = name;
  }
};

module.exports = Task;