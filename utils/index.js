const fs = require('fs');
const os = require('os');
const path = require('path');
const { dagToJson } = require('./dagToJson');
const { createDag } = require('./workflowConverter');
const { readCpuMap, readExecTimes } = require('./readConfigFiles');

const sleep = async (ms) => await new Promise(r => setTimeout(r, ms));

const saveExperimentData = (workdir, tasks, { wfStartTime, wfEndTime }, wfId) => {
  const taskData = Object.keys(tasks).map(taskId => {
    const t = tasks[taskId];
    return `${t.id} ${t.cpuId} ${t.scheduleStartTime} ${t.scheduleEndTime} ${t.actualStartTime} ${t.actualEndTime} ${wfStartTime} ${wfEndTime}`;
  }).join(os.EOL);
  fs.writeFileSync(path.join(workdir, `scheduler_task_data_${wfId}.experiment`), taskData);
};

module.exports = {
  createDag,
  dagToJson,
  readCpuMap,
  readExecTimes,
  sleep,
  saveExperimentData,
};