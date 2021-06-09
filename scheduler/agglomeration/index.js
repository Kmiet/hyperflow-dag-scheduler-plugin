const TaskBuffer = require('./taskBuffer');

class JobAgglomerator {
    constructor() {
      this.tasks = null;
      this.taskBuffers = {};

      this.tasksAlreadySubmitted = {};
      this.tasksCurrentlyBuffered = {};
    }

  /**
   * 
   * JobAgglomerator initialization
   * 
   * @param tasks - task object
   * @param schedule - map of task arrays scheduled on given CPU in provided order (i.e. { 1: [1, 3], 2: [2, 4] }) (might require adapter) (contains abstract non-existent root task id=0)
   */
    init(tasks, schedule) {
      this.tasks = tasks;
      Object.keys(schedule).forEach(cpuId => {
        this.taskBuffers[cpuId] = new TaskBuffer();
      });
    }

  /**
   * 
   * Add task to a valid buffer
   * 
   * @param taskItem - taskItem object provided by engine to buffer for execution
   */
    addTask(taskItem) {
      const taskId = taskItem.context.procId;
      const cpuId = this.tasks[taskId].getCpuId();
      this.taskBuffers[cpuId].add(taskItem);
      this.tasksCurrentlyBuffered[taskId] = true;
    }

  /**
   * 
   * Checks whether the task has been already submitted concurrently by scheduler
   * 
   * @param taskId  - ID of a task (1...N)
   */
    isTaskAlreadySubmitted(taskId) {
      return !!this.tasksAlreadySubmitted[taskId];
    }

  /**
   * 
   * Checks if task with given id is already buffered for execution
   * 
   * @param taskId  - ID of a task (1...N)
   */
    isTaskBuffered(taskId) {
      return !!this.tasksCurrentlyBuffered[taskId];
    }

  /**
   * 
   * Checks whether the buffer for provided task is ready to be executed by Hyperflow
   * 
   * @param taskId  - ID of a task (1...N)
   */
    isTaskBufferReady(taskId) {
      const cpuId = this.tasks[taskId].getCpuId();
      return this.taskBuffers[cpuId].isReadyToBeSubmitted()
    }

  /**
   * 
   * Returns taskItems from buffer to be submitted on node which given task is assigned to. Then clears whole buffer.
   * 
   * @param taskId  - ID of a task (1...N)
   */
    shiftTaskBufferFor(taskId) {
      const cpuId = this.tasks[taskId].getCpuId();
      const { content: bufferContent, ids: bufferedTaskIds } = this.taskBuffers[cpuId].getTasks();
      this.taskBuffers[cpuId].clear();

      bufferedTaskIds.forEach(tid => {
        this.tasksAlreadySubmitted[tid] = true;
        this.tasksCurrentlyBuffered[tid] = false;
      });

      return bufferContent;
    }

    checkBufferFor(taskId) {
      const cpuId = this.tasks[taskId].getCpuId();
      const { ids: bufferedTaskIds } = this.taskBuffers[cpuId].getTasks();
      return [bufferedTaskIds, cpuId];
    }
}

module.exports = JobAgglomerator;