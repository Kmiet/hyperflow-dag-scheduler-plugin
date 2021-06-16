const StaticScheduler = require('./scheduler');

/**
 * This class implements the scheduler Plugin.
 */
class StaticSchedulerPlugin {
    // setting 'pgtype' (plugin type) to 'scheduler' will make Hyperflow 
    // pass the workflow graph as part of this plugin's configuration
    
    constructor(name) {
        this.name = name || process.env.HF_VAR_SCHEDULER_ALGORITHM;
        this.pgType = "scheduler";
    }

    async init(redisClient, wflib, engine, config) {
        const scheduler = StaticScheduler.build(this.name, { config, wflib, workdir: engine.config.workdir });

        try {
            await scheduler.computeSchedule();
        } catch(e) {
            console.error(`[StaticScheduler][FatalError] Could not compute schedule: ${e}`);
            process.exit(1);
        }

        // 'scheduler' will be available in workflow functions
        // as 'context.appConfig.scheduler'
        engine.config.scheduler = scheduler;
        return;
    }
}

module.exports = StaticSchedulerPlugin;