const { spawn } = require('node:child_process');

function repairWorkflow(job) {
  return spawn('echo', [job]);
}

module.exports = { repairWorkflow };
