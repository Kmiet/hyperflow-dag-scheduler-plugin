// const fs = require('fs');
// const path = require('path');

const Node = ({id, ins, outs, phase}) => {
  return {
    id,
    nodesIn: ins,
    nodesOut: outs,
    phase,
  }
}

const createDag = (workflow) => {
  // const buffer = fs.readFileSync(path.join(workdir, 'workflow.json'));

  // const workflow = JSON.parse(buffer);
  const keys = Object.keys(workflow);

  const processes = workflow.processes || [];

  // Constants
  const inSignalToTask = {};
  const outSignalToTask = {};

  const taskToInSignals = {};
  const taskToOutSignals = {};

  const firedSignals = {};

  const phases = {};
  const nodes = {};

  // Processing

  processes.forEach((p, idx) => {
    taskToInSignals[idx] = [];
    taskToOutSignals[idx] = [];
    
    p.ins.forEach(sig => {
      taskToInSignals[idx].push(sig);
      if (inSignalToTask[sig]) {
        inSignalToTask[sig].push(idx);
      } else {
        inSignalToTask[sig] = [idx];
      }
    });

    p.outs.forEach(sig => {
      taskToOutSignals[idx].push(sig)
      outSignalToTask[sig] = idx;
    });
  });

  // Verification

  // let matching = [];
  // processes.forEach((p, idx) => {
  //   const matchesIns = p.ins.every(sig => {
  //     return taskToInSignals[idx].includes(sig) && inSignalToTask[sig].includes(idx);
  //   });

  //   const matchesOuts = p.outs.every(sig => {
  //     return taskToOutSignals[idx].includes(sig) && outSignalToTask[sig] == idx;
  //   });

  //   if (!matchesIns || !matchesOuts) {
  //     console.log("Unmatched", idx, matchesIns, matchesOuts)
  //   } else {
  //     matching.push(idx)
  //   }
  // });

  // console.log("Matched", matching, processes.length === matching.length)

  const startingSigs = workflow.ins;

  startingSigs.forEach(sig => {
    firedSignals[sig] = true;
  });

  const runningTasks = Object
    .keys(taskToInSignals)
    .filter(task =>
      taskToInSignals[task].every(
        sig => firedSignals[sig]
      )
    );

  const allTasksCount = Object.keys(taskToInSignals).length;

  let taskId;
  let phaseId = 0;
  let ranTasksCount = 0;

  while (ranTasksCount < allTasksCount) {
    // unpack
    phases[phaseId] = [];
    candidates = new Set();

    if (runningTasks.length === 0) {
      throw new Error('Cannot create dag from workflow.json');
    }

    while (runningTasks.length > 0) {
      taskId = runningTasks.shift();

      const ins = new Set(
        taskToInSignals[taskId]
          .map(sig => outSignalToTask[sig])
          .filter(n => n == 0 || !!n)
      );
      const outs = new Set();

      // dodajemy do partenta informacje o dziecku
      ins.forEach(id => nodes[id].nodesOut.add(taskId))

      // odpalamy sygnaly na zakonczenie taska i dodajemy kandydatow
      taskToOutSignals[taskId].forEach(sig => {
        firedSignals[sig] = true;
        (inSignalToTask[sig] || []).forEach(id => {
          candidates.add(id);
        });
      });

      const node = Node({
        id: taskId,
        phase: phaseId,
        ins,
        outs,
      });

      nodes[taskId] = node;
      phases[phaseId].push(taskId);

      ranTasksCount++;
    }

    phaseId++;
    
    Array.from(candidates).forEach(candidateId => {
      const isReady = taskToInSignals[candidateId].every(
        sig => firedSignals[sig]
      );

      if (isReady) {
        runningTasks.push(candidateId);
      }
    });
  }

  // console.log({ 0: nodes[0], 1: nodes[1], 2: nodes[2],  33: nodes[33], in0: taskToInSignals[0], out0: taskToOutSignals[0], dd: outSignalToTask[1], dd2: outSignalToTask[2] })
  return {
    phases: Object.values(phases),
    nodes: Object.values(nodes)
      .map(n => ({
        ...n,
        nodesIn: Array.from(n.nodesIn),
        nodesOut: Array.from(n.nodesOut),
      })), 
  };
}

module.exports = { createDag };