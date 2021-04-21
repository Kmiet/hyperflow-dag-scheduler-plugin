const HeftScheduler = require('./heftScheduler');

const ALGORITHMS = {
  HEFT: 'HEFT',
  PEFT: 'PEFT',
};

const build = (algorithm, { config, wflib, workdir }) => {
  switch((algorithm || '').toUpperCase()) {
    case ALGORITHMS.HEFT:
      return new HeftScheduler(config, wflib, workdir);
    default:
      console.error(`[StaticScheduler][FatalError] Could not find scheduler for algorithm: ${algorithm}. Provide with one of the supported names: ${Object.values(ALGORITHMS)}`);
      process.exit(1);
  }
};

module.exports = {
  build,
};