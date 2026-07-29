const API_ROOT = '/backend/ai-builder';

function $(id) { return document.getElementById(id); }

const chatHistory = $('chatHistory');
const chatInput = $('chatInput');
const sendBtn = $('sendBtn');
const modelSelect = $('modelSelect');
const progressEl = $('progress');
const planEl = $('plan');
const changedFilesEl = $('changedFiles');
const diffView = $('diffView');
const approveBtn = $('approve');
const rejectBtn = $('reject');
const runTestsBtn = $('runTests');
const revertBtn = $('revert');

let lastPendingId = null;

sendBtn.onclick = async () => {
  const text = chatInput.value.trim();
  if (!text) return;
  appendChat('You', text);
  chatInput.value = '';
  progressEl.textContent = 'Contacting AI...';

  const resp = await fetch('/api/ai-builder/message', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ message: text, model: modelSelect.value }) });
  const data = await resp.json();
  lastPendingId = data.id;
  if (data.result && data.result.plan) planEl.textContent = data.result.plan;
  if (data.result && data.result.changedFiles) renderChangedFiles(data.result.changedFiles);
  if (data.result && data.result.patches && data.result.patches.length) diffView.textContent = data.result.patches.map(p => p.patch || p.new_content || '').join('\n\n');
  progressEl.textContent = 'Planning complete — waiting for approval.';
}

approveBtn.onclick = async () => {
  if (!lastPendingId) return alert('No pending change selected');
  progressEl.textContent = 'Applying approved changes...';
  const resp = await fetch('/api/ai-builder/approve', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: lastPendingId }) });
  const j = await resp.json();
  progressEl.textContent = `Applied changes, backupId=${j.backupId || j.result?.backupId}`;
}

rejectBtn.onclick = async () => {
  if (!lastPendingId) return alert('No pending change selected');
  await fetch('/api/ai-builder/reject', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: lastPendingId }) });
  progressEl.textContent = 'Rejected pending change.';
}

runTestsBtn.onclick = async () => {
  progressEl.textContent = 'Running tests...';
  const evtSource = new EventSource('/api/ai-builder/events');
  evtSource.onmessage = (e) => {
    try { const d = JSON.parse(e.data); progressEl.textContent += '\n' + (d.chunk || JSON.stringify(d)); } catch(e) { progressEl.textContent += '\n' + e.data; }
  };
  // trigger server side running via POST
  await fetch('/api/ai-builder/run-tests', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ commands: ['npm install', 'npm test'] }) });
}

revertBtn.onclick = async () => {
  const resp = await fetch('/api/ai-builder/revert', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
  const j = await resp.json();
  progressEl.textContent = `Revert: ${JSON.stringify(j)}`;
}

function renderChangedFiles(files) {
  changedFilesEl.innerHTML = '';
  files.forEach(f => {
    const el = document.createElement('div'); el.textContent = f; el.onclick = () => loadDiffForFile(f); changedFilesEl.appendChild(el);
  });
}

function loadDiffForFile(file) {
  // client already populated diffView from patches; in a richer integration we'd fetch specific patch
}

function appendChat(who, text) {
  const d = document.createElement('div'); d.textContent = `${who}: ${text}`; chatHistory.appendChild(d); chatHistory.scrollTop = chatHistory.scrollHeight;
}
