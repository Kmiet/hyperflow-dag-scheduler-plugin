const { dagToJson } = require('./dagToJson');
const { createDag } = require('./workflowConverter');
const { readCpuMap, readExecTimes } = require('./readConfigFiles');

const sleep = async (ms) => await new Promise(r => setTimeout(r, ms));

module.exports = {
  createDag,
  dagToJson,
  readCpuMap,
  readExecTimes,
  sleep,
};