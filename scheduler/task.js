class Task {
  constructor(taskId, nodeSelector, { predecessor = null, scheduleStartTime = null, scheduleEndTime = null }) {
    this.id = taskId;
    this.pred = predecessor;
    this.nodeSelector = nodeSelector;
    this.isCompleted = false;
    
    this.actualStartTime = null;
    this.actualEndTime = null;

    this.scheduleStartTime = scheduleStartTime;
    this.scheduleEndTime = scheduleEndTime;
  }

  isCompleted() {
    return this.isCompleted;
  }

  isReady() {
    return this.pred ? this.pred.isCompleted() : true;
  }

  getNodeSelector() {
    this.startTime = Date.now();
    return this.nodeSelector;
  }

  setCompleted() {
    this.isCompleted = true;
    this.endTime = Date.now();
  }
};

module.exports = Task;