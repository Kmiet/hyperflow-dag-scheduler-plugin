const axios = require('axios');
const Task = require('./task');
const JobAgglomerator = require('./agglomeration');
const { createDag, dagToJson, readCpuMap, readExecTimes, sleep, saveExperimentData } = require('../utils');

const SCHEDULER_TIMEOUT = 1000;

class PeftScheduler {

  constructor(config, wflib, workdir) {
    this.wfJson = config.wfJson;
    this.wfId = config.wfId;
    this.wflib = wflib;
    this.workdir = workdir;
    this.tasks = {};
    
    this.allTaskCount = 0;
    this.finishedTaskCount = 0;

    // Experiment data
    this.workflowStartTime = null;
    this.workflowEndTime = null;

    // setup
    const ipAddress = process.env.HF_VAR_SCHEDULER_SERVICE_HOST || "127.0.0.1";
    this.schedulerHost = `http://${ipAddress}:5000`;
    console.log("[StaticScheduler] IP Address:", this.schedulerHost);
    this.jobAgglomerations = {};

    // My approach
    this.taskAgglomerator = new JobAgglomerator();

      // Here additional configuration could be read needed to
      // compute the schedule, e.g.:
      // - list of nodes 
      // - computation costs of tasks, etc.

      // this.computeSchedule();
  }

  async computeSchedule() {
    const numOfTasks = this.wfJson.processes.length;
    this.allTaskCount = numOfTasks;
    console.log("[StaticScheduler] Scheduling workflow, #tasks=" + numOfTasks);

    const cpuMap = readCpuMap(this.workdir);
    // console.log({ cpuMap })
    const taskExecTimes = readExecTimes(this.workdir);
    const workflowDag = createDag(this.wfJson); 
    const payload = dagToJson(workflowDag, taskExecTimes, cpuMap.length);
    // console.log(payload)

    const instance = axios.create({
      baseURL: this.schedulerHost,
      timeout: 300 * 1000,
    });

    const schedule = await instance.post('/', payload).then(response => {
      const { data: { sched } } = response;
      return sched;
    });
    
    console.log('[StaticScheduler] Schedule with abstract root and end nodes: ', schedule);
    

    const taskToPhaseId = {};
    workflowDag.phases.forEach((phase, phaseId) => {
      phase.forEach(taskId => {
        taskToPhaseId[taskId+1] = phaseId;
      });
    });
    // console.log({ schedule })
    // Calculate schedule
    Object.keys(schedule).forEach(cpuId => {
      let predecessor;
      
      schedule[cpuId].forEach(([taskId, scheduleStartTime, scheduleEndTime, _]) => {
        if (taskId > 0 && taskId <= numOfTasks) { // filter abstract root and ending node
          this.tasks[taskId] = new Task(taskId, cpuMap[cpuId],  {
            scheduleStartTime,
            scheduleEndTime,

            cpuId,
            phaseId: taskToPhaseId[taskId],
            predecessor,
          });

          predecessor = this.tasks[taskId];
        }
      });
    });

    // TODO: if( JOB_AGGLOMERATIONS provided in workflowJson ) read and call taskAgglomerator.initFromFile(...) ?
    
    this.taskAgglomerator.init(this.tasks, schedule);

    // DEBUG LOG

    // Object.keys(this.tasks).forEach(taskId => {
    //   let task = this.tasks[taskId];
    //   console.log("Task: ", task.id, "Selector: ", task.getNodeSelector(), "Pred: ", task.pred ? task.pred.id : null)
    // })

    this.workflowStartTime = Date.now();

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
    this.tasks[procId].setBeginWaitTime();

    while (!this.tasks[procId].isReady()) {
      // console.log("Scheduler computing...");
      await sleep(SCHEDULER_TIMEOUT);
    }

    return this.tasks[procId].getNodeSelector();
  }

  /**
     * addTaskItem
     * 
     * Scheduler API function which is an asynchronous alternative to
     * 'getTaskExecutionPermission', at the same time allowing to
     * execute tasks in groups (agglomeration).
     * 
     * @param taskItem - JSON object with the following structure:
     * {
     *   "ins": ins,
     *   "outs": outs,
     *   "context": context,
     *   "cb": cb
     * }
     * where: 
     * - 'ins', 'outs', 'context' and 'cb' are parameters of the task 
     * function from which 'addJobItem' has been called.
     * 
     * @param taskFunctionCb is a function '(taskArray) => taskFunction(taskArray, node)'
     * to be called asynchronously by the scheduler to execute the tasks
     * passed as 'taskArray', where: 
     * - each item in the 'taskArray' is a 'taskItem' 
     * - 'node' is the name of the node assigned by the scheduler for the task (group)
     * Example of such function is 'k8sCommandGroup':
     * https://github.com/hyperflow-wms/hyperflow/blob/56f1f6e041e79b270753f66c0c07dd04bf7d00c5/functions/kubernetes/k8sCommand.js#L22
     * 
     * Allowing task arrays enables the scheduler to agglomerate tasks
     * into groups. Configuration of task agglomeration (if any), is passed as 
     * 'taskItem.context.appConfig.jobAgglomerations'
     * (see https://github.com/hyperflow-wms/hyperflow/wiki/Task-agglomeration)
     * (Note that for a given workflow it is sufficient to read this configuration
     * only once, even though each task item will contain it.)
     *      
     */
  async addTaskItem(taskItem, taskFunctionCb) {
    const wfId = taskItem.context.appId;
    const procId = taskItem.context.procId;
    const taskData = this.wfJson[procId-1];

    this.tasks[procId].setBeginWaitTime();

    if (!this.jobAgglomerations) {
        this.jobAgglomerations = 
            taskItem.context.appConfig.jobAgglomerations; // could be undefined
    }

    const predecessor = this.tasks[procId].getPredecessor() || {};
    const predId = predecessor.id || -1;

    const canBuferTask = predecessor && this.tasks[procId].isSameOrEarlierPhase(predecessor) ? (
      () => this.tasks[procId].isReady() || this.taskAgglomerator.isTaskBuffered(predId)
    ) : (
      () => this.tasks[procId].isReady()
    );

    while (!canBuferTask()) {
      // console.log(procId, canBuferTask())
      await sleep(SCHEDULER_TIMEOUT);
    }

    this.taskAgglomerator.addTask(taskItem);

    while (!this.taskAgglomerator.isTaskBufferReady(procId) && !this.taskAgglomerator.isTaskAlreadySubmitted(procId)) {
      await sleep(SCHEDULER_TIMEOUT);
    }

    if (this.taskAgglomerator.isTaskAlreadySubmitted(procId)) {
      this.tasks[procId].getNodeSelector();
      return taskFunctionCb([], "");
    }

    const taskItemsToBeSubmitted = this.taskAgglomerator.shiftTaskBufferFor(procId);
    const nodeSelector = this.tasks[procId].getNodeSelector();

    // Here the scheduler simply immediately invokes the callback to execute the task
    return taskFunctionCb(taskItemsToBeSubmitted, nodeSelector);
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
    console.log("[StaticScheduler] Completed task:", procId);
    this.tasks[procId].setCompleted()
    this.finishedTaskCount++;
    if (this.finishedTaskCount === this.allTaskCount) {
      this.workflowEndTime = Date.now();
      saveExperimentData(this.workdir, this.tasks, {
        wfStartTime: this.workflowStartTime,
        wfEndTime: this.workflowEndTime,
      }, wfId);
    }
  }
}

module.exports = PeftScheduler;