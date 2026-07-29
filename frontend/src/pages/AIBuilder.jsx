import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage, connectEvents } from '@/lib/aiBuilderClient';

function ChatPanel({ onSend, sending }) {
  const [text, setText] = useState('');
  const [model, setModel] = useState('qwen2.5:3b-instruct');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-3 bg-white border rounded-md">
        <div id="chatHistory" className="space-y-3"></div>
      </div>
      <div className="mt-3">
        <textarea value={text} onChange={e => setText(e.target.value)} className="w-full p-2 border rounded" rows="3" placeholder="Type commands..." />
        <div className="mt-2 flex gap-2 items-center">
          <button onClick={async () => { if (!text) return; await onSend({ message: text, model }); setText(''); }} className="px-3 py-1 rounded bg-blue-600 text-white" disabled={sending}>Send</button>
          <select value={model} onChange={e => setModel(e.target.value)} className="border rounded px-2">
            <option>qwen2.5-coder:7b</option>
            <option>qwen2.5:3b-instruct</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ProgressPanel({ status, plan, logs }) {
  return (
    <div className="p-3 h-full flex flex-col gap-3">
      <div className="border rounded p-3 bg-white">
        <div className="text-xs text-gray-500">Status</div>
        <div className="mt-2 font-semibold">{status}</div>
      </div>

      <div className="border rounded p-3 bg-white flex-1 overflow-auto">
        <h4 className="font-medium">Implementation Plan</h4>
        <pre className="whitespace-pre-wrap mt-2 text-sm">{plan || 'No plan yet.'}</pre>
      </div>

      <div className="border rounded p-3 bg-white">
        <h5 className="font-medium">Real-time Progress</h5>
        <pre className="text-xs bg-gray-900 text-green-200 p-2 rounded h-24 overflow-auto">{logs.join('\n')}</pre>
      </div>
    </div>
  );
}

function parseUnifiedDiff(patch) {
  const out = [];
  if (!patch) return out;
  const lines = patch.split('\n');
  for (const l of lines) {
    if (l.startsWith('+++') || l.startsWith('---') || l.startsWith('@@')) {
      out.push({ line: l, type: 'meta' });
    } else if (l.startsWith('+')) {
      out.push({ line: l, type: 'added' });
    } else if (l.startsWith('-')) {
      out.push({ line: l, type: 'removed' });
    } else {
      out.push({ line: l, type: 'context' });
    }
  }
  return out;
}

function FileDiff({ patch }) {
  const parsed = parseUnifiedDiff(patch);
  return (
    <div className="text-xs font-mono">
      {parsed.map((p, idx) => (
        <div key={idx} className={`whitespace-pre-wrap ${p.type==='added'? 'bg-emerald-50 text-emerald-800 p-0.5' : p.type==='removed'? 'bg-rose-50 text-rose-800 p-0.5' : p.type==='meta'? 'text-gray-500' : 'text-gray-700'}`}>
          {p.line}
        </div>
      ))}
    </div>
  );
}

function getPatchFileNameFromPatch(p) {
  if (!p) return null;
  const possible = ['file', 'filename', 'path', 'filePath', 'new_path', 'old_path', 'newFile', 'fileName'];
  for (const k of possible) {
    if (p[k]) return p[k];
  }
  const content = p.patch || p.new_content || '';
  const m = content.match(/^(?:\+\+\+|---)\s+(?:a|b)?\/?(.+)$/m);
  if (m && m[1]) return m[1].trim();
  return null;
}

function normalizePath(p) {
  if (!p) return null;
  let s = String(p).replace(/\\\\/g, '/').replace(/\\/g, '/').trim();
  if (s.startsWith('./')) s = s.slice(2);
  s = s.replace(/\/+/g, '/');
  if (s.endsWith('/')) s = s.slice(0, -1);
  if (s.startsWith('/')) s = s.slice(1);
  return s;
}

function variantsForPath(p) {
  const n = normalizePath(p);
  if (!n) return [];
  const variants = new Set();
  variants.add(n);
  // strip common top-level prefixes
  variants.add(n.replace(/^frontend\//, ''));
  variants.add(n.replace(/^backend\//, ''));
  variants.add(n.replace(/^src\//, ''));
  variants.add(n.replace(/^app\//, ''));
  variants.add(n.replace(/^public\//, ''));
  // basename
  const base = n.split('/').pop();
  variants.add(base);
  // also try with and without a leading './' and '/'
  variants.add('./' + n);
  variants.add('/' + n);
  return Array.from(variants).filter(Boolean);
}

function findPatchForFile(patches, filename, index) {
  if (!patches || !patches.length) return null;
  const targetVariants = variantsForPath(filename);
  // Try metadata/header matches with normalized variants
  for (const p of patches) {
    const fname = getPatchFileNameFromPatch(p);
    if (!fname) continue;
    const fnameVariants = variantsForPath(fname);
    // direct intersection
    for (const a of fnameVariants) {
      for (const b of targetVariants) {
        if (!a || !b) continue;
        if (a === b) return p;
        if (a.endsWith('/' + b) || b.endsWith('/' + a)) return p;
      }
    }
  }
  // fallback: try basename-only matches
  const targetBase = normalizePath(filename)?.split('/').pop();
  if (targetBase) {
    for (const p of patches) {
      const fname = getPatchFileNameFromPatch(p);
      if (!fname) continue;
      const base = normalizePath(fname)?.split('/').pop();
      if (base && base === targetBase) return p;
    }
  }
  // final fallback: index-aligned patch
  return patches[index] || null;
}

function FilesPanel({ files, patches }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (f) => setExpanded(e => ({ ...e, [f]: !e[f] }));

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="border rounded p-2 bg-white overflow-auto">
        <h5 className="font-medium">Changed Files</h5>
        <ul className="text-sm mt-2 space-y-2">
          {files && files.length ? files.map((f, i) => {
            const patchObj = findPatchForFile(patches, f, i);
            const patchText = (patchObj && (patchObj.patch || patchObj.new_content)) || 'No diff available.';
            return (
              <li key={f} className="p-1">
                <div className="flex justify-between items-center">
                  <div className="truncate max-w-xs">{f}</div>
                  <button onClick={() => toggle(f)} className="text-xs px-2 py-0.5 rounded border">{expanded[f] ? 'Collapse' : 'Expand'}</button>
                </div>
                {expanded[f] && (
                  <div className="mt-2 border rounded p-2 bg-gray-50">
                    <FileDiff patch={patchText} />
                  </div>
                )}
              </li>
            );
          }) : <li className="p-1 text-gray-500">No changed files</li>}
        </ul>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1 rounded bg-gray-200" disabled>Approve Changes</button>
        <button className="px-3 py-1 rounded bg-white border" disabled>Reject Changes</button>
        <button className="px-3 py-1 rounded bg-white border" disabled>Run Tests</button>
        <button className="px-3 py-1 rounded bg-white border" disabled>Revert Last Change</button>
      </div>
    </div>
  );
}

const DEFAULT_PREVIEW_URLS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];
const PREVIEW_STORAGE_KEY = 'ai_builder_preview_url';

function PreviewPanel({ previewUrl, previewKey, status, error, loading, onChange, onTest, onRefresh, onOpen, onIframeLoad }) {
  return (
    <div className="mt-4 border rounded p-3 bg-white">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h5 className="font-medium">Live Preview</h5>
          <p className="text-xs text-gray-500">Load a local frontend dev server inside the AI Builder page.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="px-3 py-1 rounded bg-blue-600 text-white text-xs">Refresh Preview</button>
          <button onClick={onOpen} className="px-3 py-1 rounded bg-white border text-xs">Open in New Tab</button>
        </div>
      </div>
      <div className="grid gap-2 mb-3">
        <select value={previewUrl} onChange={e => onChange(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
          {DEFAULT_PREVIEW_URLS.map(url => <option key={url} value={url}>{url}</option>)}
        </select>
        <input value={previewUrl} onChange={e => onChange(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Custom preview URL" />
        <button onClick={onTest} className="w-full px-3 py-2 rounded bg-gray-900 text-white text-sm">Set preview URL</button>
      </div>
      <div className="text-sm mb-2">
        <span className="font-medium">Status:</span> {loading ? 'Loading...' : status}
      </div>
      {error ? <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded">{error}</div> : null}
      <div className="mt-3 rounded border overflow-hidden h-72 bg-black">
        <iframe
          key={`${previewUrl}-${previewKey}`}
          title="AI Builder Preview"
          src={previewUrl}
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin allow-forms"
          allow="clipboard-read; clipboard-write; geolocation; microphone; camera"
          onLoad={onIframeLoad}
        />
      </div>
    </div>
  );
}

export default function AIBuilderPage() {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('lf_token') : null;
  const [status, setStatus] = useState('Idle');
  const [plan, setPlan] = useState('');
  const [files, setFiles] = useState([]);
  const [patches, setPatches] = useState([]);
  const [diff, setDiff] = useState('');
  const [logs, setLogs] = useState([]);
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(DEFAULT_PREVIEW_URLS[0]);
  const [previewStatus, setPreviewStatus] = useState('idle');
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const disconnectRef = useRef(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(PREVIEW_STORAGE_KEY) : null;
    const initialUrl = saved || DEFAULT_PREVIEW_URLS[0];
    setPreviewUrl(initialUrl);

    const probeUrls = async () => {
      for (const url of DEFAULT_PREVIEW_URLS) {
        const available = await testPreviewUrl(url, false);
        if (available) {
          setPreviewUrl(url);
          return;
        }
      }
    };

    probeUrls();
  }, []);

  useEffect(() => {
    // connect to events stream
    let closed = false;
    (async () => {
      disconnectRef.current = await connectEvents({ token, onEvent: (ev) => {
        if (ev.type === 'log' || ev.type === 'progress') {
          setLogs(l => [...l.slice(-200), ev.chunk || JSON.stringify(ev)]);
          setStatus('Planning');
        } else if (ev.type === 'plan') {
          setPlan(ev.plan || JSON.stringify(ev));
        } else if (ev.type === 'patch') {
          setDiff(ev.patch || ev.new_content || JSON.stringify(ev));
        } else if (ev.type === 'done') {
          setStatus('Waiting for Approval');
        } else {
          setLogs(l => [...l.slice(-200), JSON.stringify(ev)]);
        }
      }, onError: (e) => {
        setLogs(l => [...l, 'Events connection error: ' + (e.message || e.toString())]);
      } });
    })();
    return () => { if (disconnectRef.current) disconnectRef.current(); closed = true; };
  }, [token]);

  const testPreviewUrl = async (url, save = true) => {
    if (!url) return false;
    setPreviewLoading(true);
    setPreviewStatus('checking');
    setPreviewError('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      await fetch(url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeout);
      setPreviewStatus('ready');
      setPreviewError('');
      if (save && typeof window !== 'undefined') {
        localStorage.setItem(PREVIEW_STORAGE_KEY, url);
      }
      return true;
    } catch (err) {
      setPreviewStatus('error');
      setPreviewError('Preview unreachable: ' + (err.message || 'network error'));
      return false;
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewUrlChange = (url) => {
    setPreviewUrl(url);
    setPreviewError('');
    setPreviewStatus('idle');
  };

  const handlePreviewTest = async () => {
    await testPreviewUrl(previewUrl);
  };

  const handleRefreshPreview = () => {
    setPreviewError('');
    setPreviewStatus('loading');
    setPreviewKey(k => k + 1);
  };

  const handleOpenPreview = () => {
    if (previewUrl) window.open(previewUrl, '_blank');
  };

  const handleIframeLoad = () => {
    if (previewStatus !== 'error') {
      setPreviewStatus('ready');
      setPreviewLoading(false);
    }
  };

  const handleSend = async ({ message, model }) => {
    setSending(true);
    setStatus('Planning');
    setLogs(l => [...l, 'Sending message to AI...']);
    try {
      const resp = await sendMessage({ message, model, token });
      if (resp && resp.result) {
        setPlan(resp.result.plan || '');
        setFiles(resp.result.changedFiles || []);
        setPatches(resp.result.patches || []);
        setDiff((resp.result.patches && resp.result.patches[0] && (resp.result.patches[0].patch || resp.result.patches[0].new_content)) || '');
        setLogs(l => [...l, 'Plan received (pending review)']);
        setStatus('Waiting for Approval');
      }
    } catch (e) {
      setLogs(l => [...l, 'Error: ' + (e.message || e.toString())]);
      setStatus('Error');
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-80 p-4 border-r bg-gray-50">
        <h3 className="font-semibold mb-2">AI Builder</h3>
        <ChatPanel onSend={handleSend} sending={sending} />
      </div>

      <div className="flex-1 p-6">
        <ProgressPanel status={status} plan={plan} logs={logs} />
      </div>

      <div className="w-96 p-4 border-l bg-white overflow-auto">
        <FilesPanel files={files} patches={patches} />
        <PreviewPanel
          previewUrl={previewUrl}
          previewKey={previewKey}
          status={previewStatus}
          error={previewError}
          loading={previewLoading}
          onChange={handlePreviewUrlChange}
          onTest={handlePreviewTest}
          onRefresh={handleRefreshPreview}
          onOpen={handleOpenPreview}
          onIframeLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
