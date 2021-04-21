const fs = require('fs');
const path = require('path');
const os = require('os');

const readCpuMap = (workdir) => {
  const buffer = fs.readFileSync(path.join(workdir, 'cpuMap.dat'));
  return buffer
    .toString()
    .split(os.EOL)
    .map(line => line.split(' '))
    .reduce((acc, [nodeSelector, nodeCpuCount]) => {
      return [ ...acc, ...Array.from({ length: nodeCpuCount }, _ => nodeSelector) ];
    }, []);
};

const readExecTimes = (workdir) => {
  const buffer = fs.readFileSync(path.join(workdir, 'execTimes.dat'));
  return buffer.toString().split(os.EOL).filter(entry => entry != '')//.map(line => line.split(' '))
};

module.exports = {
  readCpuMap,
  readExecTimes,
};