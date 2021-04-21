const axios = require('axios');
const Task = require('./task');
const { createDag, dagToJson, readCpuMap, readExecTimes } = require('../utils');

const sleep = async (ms) => await new Promise(r => setTimeout(r, ms));

class HeftScheduler {

  constructor(config, wflib, workdir) {
    this.wfJson = config.wfJson;
    this.wfId = config.wfId;
    this.wflib = wflib;
    this.workdir = workdir;
    this.tasks = {};

      // Here additional configuration could be read needed to
      // compute the schedule, e.g.:
      // - list of nodes 
      // - computation costs of tasks, etc.

      // this.computeSchedule();
  }

  async computeSchedule() {
    const numOfTasks = this.wfJson.processes.length;
    console.log("[StaticScheduler] Scheduling workflow, #tasks=" + numOfTasks);

    const cpuMap = readCpuMap(this.workdir);
    console.log({ cpuMap })
    const taskExecTimes = readExecTimes(this.workdir);
    const payload = dagToJson(createDag(this.wfJson), taskExecTimes, cpuMap.length);

    const instance = axios.create({
      baseURL: 'http://127.0.0.1:5000',
      timeout: 300 * 1000,
    });

    const schedule = await instance.post('/', payload).then(response => {
      const { data: { sched } } = response;
      return sched;
    });

    Object.keys(schedule).forEach(cpuId => {
      let predecessor;
      
      schedule[cpuId].forEach(([taskId, scheduleStartTime, scheduleEndTime, _]) => {
        if (taskId !== 0) { // filter abstract root node
          this.tasks[taskId] = new Task(taskId, cpuMap[cpuId],  {
            scheduleStartTime,
            scheduleEndTime,

            predecessor,
          });
          predecessor = this.tasks[taskId];
        }
      });
    });

    // Object.keys(this.tasks).forEach(taskId => {
    //   let task = this.tasks[taskId];
    //   console.log("Task: ", task.id, "Selector: ", task.getNodeSelector(), "Pred: ", task.pred ? task.pred.id : null)
    // })



      // TODO
      // Here the scheduler should compute the schedule for the workflow
      // and store it in some internal data structures
    return;
  }

  /**
   * 
   * Scheduler API method used to wait for permission to execute a task
   * 
   * @param wfId   - workflow identifier (integer 1..N)
   * @param procId - process identifier (integer 1..N) 
   *                 NOTE! taskData = wfJson[procId-1]
   * @returns name of the node to run the task on
   */
  async getTaskExecutionPermission(wfId, procId) {
    while (!this.tasks[procId].isReady()) {
        console.log("Scheduler computing...");
        await sleep(2000);
    }

    return this.tasks[procId].getNodeSelector();
  }

  /**
   * 
   * Scheduler API method whereby the scheduler receives information 
   * that task @procId in workflow @wfId has been completed. 
   * Here the scheduler can trigger execution of next task(s).
   * A dynamic scheduler can even recompute the schedule, etc. 
   * 
   * @param wfId - workflow identifier (integer 1..N)
   * @param procId - process identifier (integer 1..N)
   */
  notifyTaskCompletion(wfId, procId) {
    this.tasks[procId].setCompleted()
  }
}

module.exports = HeftScheduler;