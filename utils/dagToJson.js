const CPU_COUNT = 4;

// Connectivity Matrix
const createCpuMatrix = (cpuCount = CPU_COUNT) => {
  let x = Array.from({ length: cpuCount + 1 },
    (_, i) => Array.from({ length: cpuCount + 1 }, 
      (__, j) => i === j ? 0 : 1
    )
  );

  let i = 1;
  x[0][0] = 'P'

  while(i <= cpuCount) {
    x[i][0] = `P_${i-1}`;
    x[0][i] = `P_${i-1}`;
    i++;
  }

  return x;
};

// DAG Matrix
const createCommMatrix = (phases, nodes) => {
  let commMatrix = Array.from({ length: nodes.length + 1 + 1 }, // + 1 starting node overhead
    (_, i) => Array.from({ length: nodes.length + 1 + 1 }, // + 1 starting node overhead
      __ => 0
    )
  );

  phases.forEach(phase => {
    phase.forEach(taskId => {
      nodes[taskId].nodesOut.forEach(outTaskId => {
        const tid = parseInt(taskId);
        const oid = parseInt(outTaskId);
        commMatrix[tid+2][oid+2] = 1;
      });
    });
  });

  commMatrix[0][0] = 'T';
  commMatrix.forEach((_, i) => {
    if (i !== 0) {
      commMatrix[0][i] = `T_${i-1}`;
      commMatrix[i][0] = `T_${i-1}`;
    }
  });

  // append additional abstract root task (starting node overhead)
  phases[0].forEach(taskId => {
    const tid = parseInt(taskId);
    commMatrix[1][tid+2] = 1;
  });

  return commMatrix;
};

// Computation Matrix
const createExecTimeMatrix = (times, cpuCount = CPU_COUNT) => {
  let x = Array.from({ length: times.length + 1 + 1 }, // + 1 starting node overhead
    (_, i) => Array.from({ length: cpuCount + 1 }, 
      __ => i < 2 ? times[i] : times[i-2]
    )
  );

  x[0][0] = 'TP';
  x[0].forEach((_, i) =>{
    if(i !== 0) {
      x[0][i] = `P_${i-1}`;
    }
  });

  x.forEach((row, i) => {
    if(i !== 0) {
      row[0] = `T_${i-1}`
    }
  })

  return x;
};

const dagToJson = ({ phases, nodes }, taskExecTimes, cpuCount) => {
  // const { phases, nodes } = createDag();
  // console.log({ x: nodes[0], y: nodes[33], z: nodes[105] })

  const dagMatrix = createCommMatrix(phases, nodes);

  // console.log({ dagMatrix })
  // console.log(dagMatrix[0])

  const cpuMatrix = createCpuMatrix(cpuCount);
  // console.log({ cpuMatrix });

  const timeMatrix = createExecTimeMatrix(taskExecTimes, cpuCount);

  return {
    cpuMatrix,
    dagMatrix,
    timeMatrix,
  }
};

module.exports = { dagToJson };