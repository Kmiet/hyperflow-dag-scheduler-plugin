const BUFFER_WAIT_TIME = 2000;

class TaskBuffer {
  constructor() {
    this.content = new Array();
    this.taskIds = new Array();
    this.bufferLastUpdate = null;
  }

  add(taskItem) {
    const taskId = taskItem.context.procId;
    this.bufferLastUpdate = Date.now();
    this.content.push(taskItem);
    this.taskIds.push(taskId);
  }

  isReadyToBeSubmitted(allowedWaitTime = BUFFER_WAIT_TIME) {
    return this.bufferLastUpdate && (( Date.now() - this.bufferLastUpdate ) > allowedWaitTime );
  }

  getTasks() {
    return { content: this.content, ids: this.taskIds };
  }

  clear() {
    this.content = new Array();
    this.taskIds = new Array();
    this.bufferLastUpdate = null;
  }
}

module.exports = TaskBuffer;