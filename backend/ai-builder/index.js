const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const { generatePlanAndPatch, applyPatch, revertLastBackup, listPending, approvePending, runCommands } = require('./aiBuilder');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'legalflow-secret';

function verifyAuth(req, res) {
  const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!auth) return { ok: false, error: 'authorization required' };
  const parts = auth.split(' ');
  if (parts.length !== 2) return { ok: false, error: 'invalid authorization header' };
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { ok: true, user: decoded };
  } catch (e) {
    return { ok: false, error: 'invalid token' };
  }
}

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const eventEmitters = new Map();
function broadcastEvent(event) {
  for (const emitter of eventEmitters.values()) {
    emitter.emit('data', event);
  }
}

app.post('/api/ai-builder/message', async (req, res) => {
  const auth = verifyAuth(req, res);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const { message, model } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const result = await generatePlanAndPatch({ message, model, projectRoot: path.resolve(__dirname, '..', '..'), user: auth.user, onProgress: broadcastEvent });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai-builder/events', (req, res) => {
  const id = `${Date.now()}-${Math.random()}`;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  const emitter = new EventEmitter();
  eventEmitters.set(id, emitter);

  const onData = (d) => {
    res.write(`data: ${JSON.stringify(d)}\n\n`);
  };

  emitter.on('data', onData);

  req.on('close', () => {
    emitter.removeListener('data', onData);
    eventEmitters.delete(id);
  });

  // keep connection open
});

app.post('/api/ai-builder/approve', async (req, res) => {
  try {
    const auth = verifyAuth(req, res);
    if (!auth.ok) return res.status(401).json({ error: auth.error });

    const { id, forceEnv } = req.body || {};
    const result = await approvePending({ id, forceEnv: !!forceEnv, projectRoot: path.resolve(__dirname, '..', '..'), user: auth.user });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai-builder/reject', async (req, res) => {
  try {
    const { id } = req.body || {};
    const list = await listPending({ projectRoot: path.resolve(__dirname, '..', '..') });
    // simple delete pending by id
    const pendingDir = path.join(__dirname, 'state');
    const pfile = path.join(pendingDir, `${id}.json`);
    if (fs.existsSync(pfile)) fs.unlinkSync(pfile);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai-builder/run-tests', async (req, res) => {
  const { commands } = req.body || { commands: ['npm install', 'npm test'] };
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  const auth = verifyAuth(req, res);
  if (!auth.ok) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: auth.error })}\n\n`);
    return res.end();
  }

  try {
    for await (const chunk of runCommands(commands, { cwd: path.resolve(__dirname, '..', '..') })) {
      res.write(`data: ${JSON.stringify({ type: 'log', chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  }
});

app.post('/api/ai-builder/revert', async (req, res) => {
  const auth = verifyAuth(req, res);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const { backupId } = req.body || {};
  try {
    const r = await revertLastBackup({ backupId, projectRoot: path.resolve(__dirname, '..', '..'), user: auth.user });
    return res.json({ ok: true, result: r });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4321;
app.listen(PORT, () => console.log(`AI Builder service running on http://localhost:${PORT}`));
