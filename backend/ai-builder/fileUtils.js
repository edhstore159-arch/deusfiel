const fs = require('fs');
const path = require('path');

function walk(dir, cb, ignore = ['node_modules', '.git']) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (ignore.includes(e.name)) continue;
    if (e.isDirectory()) walk(full, cb, ignore);
    else cb(full);
  }
}

function summarizeProjectFiles({ projectRoot }) {
  const files = [];
  walk(projectRoot, (f) => {
    try {
      const stat = fs.statSync(f);
      const rel = path.relative(projectRoot, f);
      files.push({ path: rel, size: stat.size });
    } catch (e) {}
  });
  // simple summary
  return files.slice(0, 200).map(f => `${f.path} (${f.size} bytes)`).join('\n');
}

module.exports = { summarizeProjectFiles };
