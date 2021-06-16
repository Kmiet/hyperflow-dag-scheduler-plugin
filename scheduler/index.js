const EmptyScheduler = require('./emptyScheduler');
const HeftScheduler = require('./heftScheduler');
const PeftScheduler = require('./peftScheduler');

const ALGORITHMS = {
  EMPTY: 'EMPTY',
  HEFT: 'HEFT',
  PEFT: 'PEFT',
};

const build = (algorithm, { config, wflib, workdir }) => {
  switch((algorithm || '').toUpperCase()) {
    case ALGORITHMS.EMPTY:
      return new EmptyScheduler(config, wflib, workdir);
    case ALGORITHMS.HEFT:
      return new HeftScheduler(config, wflib, workdir);
    case ALGORITHMS.PEFT:
      return new PeftScheduler(config, wflib, workdir);
    default:
      console.error(`[StaticScheduler][FatalError] Could not find scheduler for algorithm: ${algorithm}. Provide with one of the supported names: ${Object.values(ALGORITHMS)}`);
      process.exit(1);
  }
};

module.exports = {
  build,
};