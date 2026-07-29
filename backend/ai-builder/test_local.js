const path = require('path');
const { generatePlanAndPatch } = require('./aiBuilder');

(async () => {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const message = 'Create an AI Builder dashboard section similar to Lovable with chat, plan, diffs, and approval workflow.';
    const result = await generatePlanAndPatch({ message, model: process.env.OLLAMA_MODEL, projectRoot });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('ERROR', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();
