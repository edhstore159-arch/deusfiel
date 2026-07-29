const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const { diffLines, createPatch, applyPatch: jsApplyPatch } = require('diff');
const { spawn } = require('child_process');
const { summarizeProjectFiles } = require('./fileUtils');
const { callOllama } = require('./ollamaClient');
const { execSync } = require('child_process');

function isPathInside(root, target) {
  const r = path.resolve(root);
  const t = path.resolve(target);
  return t === r || t.startsWith(r + path.sep);
}

function ensureSafeFilePath(projectRoot, filePath) {
  const abs = path.resolve(projectRoot, filePath);
  if (!isPathInside(projectRoot, abs)) throw new Error('path outside of project root is not allowed: ' + filePath);
  if (filePath.includes('..')) throw new Error('parent traversal not allowed: ' + filePath);
  // block editing .env files
  if (path.basename(filePath).startsWith('.env')) throw new Error('.env edits are not permitted');
  return abs;
}

const STATE_DIR = path.join(__dirname, 'state');
mkdirp.sync(STATE_DIR);

async function generatePlanAndPatch({ message, model, projectRoot, onProgress }) {
  const sendProgress = (event) => {
    if (typeof onProgress === 'function') onProgress(event);
  };

  // analyze project
  sendProgress({ type: 'log', message: 'Summarizing project structure...' });
  const summary = await summarizeProjectFiles({ projectRoot });

  // call Ollama for plan and patches
  const prompt = `You are an assistant that will produce a detailed implementation plan and unified diffs for requested changes. Project summary:\n${summary}\nUser request:\n${message}\nRespond JSON: {"plan":"...","patches":[{"file":"path/to/file","patch":"<unified diff>"}],"changedFiles":["path/to/file"]}`;

  const modelName = model || process.env.OLLAMA_MODEL || 'qwen2.5:3b-instruct';
  sendProgress({ type: 'log', message: `Sending prompt to Ollama model ${modelName}...` });
  const responseText = await callOllama({ prompt, model: modelName });
  sendProgress({ type: 'log', message: 'Received Ollama response.' });

  // Expect model to return JSON; attempt parse
  let parsed = null;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    // fallback: wrap text into plan
    parsed = { plan: responseText, patches: [], changedFiles: [] };
  }

  sendProgress({ type: 'plan', plan: parsed.plan || '' });
  if (Array.isArray(parsed.changedFiles) && parsed.changedFiles.length) {
    sendProgress({ type: 'log', message: `Found ${parsed.changedFiles.length} changed files.` });
  }
  if (Array.isArray(parsed.patches)) {
    for (const patch of parsed.patches) {
      sendProgress({ type: 'patch', patch: patch.patch || patch.new_content || '', file: patch.file });
    }
  }
  sendProgress({ type: 'done' });

  // save pending result
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  const pfile = path.join(STATE_DIR, `${id}.json`);
  fs.writeFileSync(pfile, JSON.stringify({ id, message, model: modelName, result: parsed, createdAt: Date.now() }, null, 2));

  return { id, result: parsed };
}

async function listPending({ projectRoot }) {
  const files = fs.readdirSync(STATE_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(STATE_DIR, f), 'utf8')));
}

async function approvePending({ id, projectRoot }) {
  const pfile = path.join(STATE_DIR, `${id}.json`);
  if (!fs.existsSync(pfile)) throw new Error('pending id not found');
  const pending = JSON.parse(fs.readFileSync(pfile, 'utf8'));

  // create backup and prepare git branch if possible
  const backups = path.join(STATE_DIR, 'backups');
  mkdirp.sync(backups);
  const backupId = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  const backupDir = path.join(backups, backupId);
  mkdirp.sync(backupDir);

  // attempt to create a git branch for this change (if repo exists)
  try {
    const isGit = execSync('git rev-parse --is-inside-work-tree', { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (isGit === 'true') {
      const branch = `ai-builder/${id}`.replace(/[^a-zA-Z0-9_\/-]/g, '-');
      try {
        execSync(`git checkout -b ${branch}`, { cwd: projectRoot, stdio: 'ignore' });
      } catch (e) {
        // branch creation may fail if branch exists; continue
      }
    }
  } catch (e) {
    // not a git repo or git not available; continue with filesystem backups
  }

  // copy changed files to backup (validate paths)
  for (const p of (pending.result.patches || [])) {
    if (!p.file) continue;
    const abs = ensureSafeFilePath(projectRoot, p.file);
    if (fs.existsSync(abs)) {
      mkdirp.sync(path.dirname(path.join(backupDir, p.file)));
      fs.copyFileSync(abs, path.join(backupDir, p.file));
    }
  }

  // check .env edits
  const editingEnv = (pending.result.patches || []).some(p => p.file && p.file.includes('.env'));
  if (editingEnv && !(arguments[0] && arguments[0].forceEnv)) {
    throw new Error('.env modifications require explicit forceEnv:true approval');
  }

  // apply patches
  for (const p of (pending.result.patches || [])) {
    if (!p.file) continue;
    const target = ensureSafeFilePath(projectRoot, p.file);
    // naive apply: if patch contains full file content, write it
    if (p.patch && p.patch.indexOf('+++') !== -1) {
      // attempt jsdiff apply
      try {
        const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
        const patched = jsApplyPatch(current, p.patch);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, patched, 'utf8');
      } catch (e) {
        // fallback: if patch provides `new_content` field
        if (p.new_content) {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, p.new_content, 'utf8');
        } else {
          throw e;
        }
      }
    } else if (p.new_content) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, p.new_content, 'utf8');
    }
  }

  // attempt to commit changes to git (if available)
  let gitCommit = null;
  try {
    const changedFiles = (pending.result.patches || []).map(p => p.file).filter(Boolean);
    if (changedFiles.length) {
      try {
        execSync(`git add ${changedFiles.map(f => `"${f}"`).join(' ')}`, { cwd: projectRoot, stdio: 'ignore' });
        execSync(`git commit -m "ai-builder: ${id} - applied changes"`, { cwd: projectRoot, stdio: 'ignore' });
        gitCommit = execSync('git rev-parse --short HEAD', { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      } catch (e) {
        // commit might fail; ignore but keep backups
      }
    }
  } catch (e) {
    // ignore git errors
  }

  // mark applied
  const applied = { appliedAt: Date.now(), backupId, id, gitCommit };
  fs.writeFileSync(path.join(STATE_DIR, `${id}.applied.json`), JSON.stringify(applied, null, 2));
  // append to modifications log
  const logLine = `${new Date().toISOString()} APPLY id=${id} backup=${backupId} gitCommit=${gitCommit||''} files=${(pending.result.changedFiles||[]).join(',')} message=${(pending.message||'').replace(/\n/g,' ')}\n`;
  fs.appendFileSync(path.join(STATE_DIR, 'modifications.log'), logLine);
  return { ok: true, backupId, gitCommit };
}

async function revertLastBackup({ backupId, projectRoot }) {
  const backups = path.join(STATE_DIR, 'backups');
  const chosen = backupId || fs.readdirSync(backups).sort().reverse()[0];
  if (!chosen) throw new Error('no backup found');
  const backupDir = path.join(backups, chosen);
  if (!fs.existsSync(backupDir)) throw new Error('backup not found');

  // restore files
  function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      mkdirp.sync(dest);
      for (const f of fs.readdirSync(src)) {
        copyRecursive(path.join(src, f), path.join(dest, f));
      }
    } else {
      mkdirp.sync(path.dirname(dest));
      fs.copyFileSync(src, dest);
    }
  }

  copyRecursive(backupDir, projectRoot);
  return { ok: true, restoredFrom: chosen };
}

async function runCommands(commands, opts = {}) {
  // returns async iterator yielding chunks
  async function* gen() {
    for (const c of commands) {
      const lowered = (c || '').toLowerCase();
      const blockedPatterns = [/\brm\s+-rf\b/, /\bsudo\b/, /\bdd\s+if=/, /mkfs\b/, /shred\b/, /:\(\)\s*\{\s*:\|:&\s*\};?/, /shutdown\b/, /reboot\b/];
      for (const pat of blockedPatterns) {
        if (pat.test(lowered)) throw new Error(`Blocked dangerous command matching ${pat}`);
      }

      yield { cmd: c, out: `START ${c}` };

      // async queue for process output
      const queue = [];
      let waiting = null;
      function pushEvent(item) {
        queue.push(item);
        if (waiting) { waiting(); waiting = null; }
      }
      function nextEvent() {
        if (queue.length) return Promise.resolve(queue.shift());
        return new Promise((res) => { waiting = () => res(queue.shift()); });
      }

      const ps = spawn(c, { cwd: opts.cwd || process.cwd(), shell: true });
      let closed = false;
      ps.stdout.on('data', (data) => pushEvent({ cmd: c, out: data.toString(), stream: 'stdout' }));
      ps.stderr.on('data', (data) => pushEvent({ cmd: c, out: data.toString(), stream: 'stderr' }));
      ps.on('close', (code) => { pushEvent({ cmd: c, out: `EXIT ${code}`, code }); closed = true; });

      // consume events until process closed and queue drained
      while (!closed || queue.length) {
        const ev = await nextEvent();
        if (ev) yield ev;
      }

      yield { cmd: c, out: `FINISHED ${c}` };
    }
  }
  return gen();
}

module.exports = { generatePlanAndPatch, approvePending, listPending, revertLastBackup, runCommands };
