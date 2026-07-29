const fetch = require('node-fetch');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

async function callOllama({ prompt, model }) {
  // Simple call to Ollama HTTP API. Adjust if your Ollama install uses a different path.
  const url = `${OLLAMA_URL}/api/generate`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, max_tokens: 15000 })
    });
    const text = await resp.text();
    if (!resp.ok) {
      const errText = text || `status ${resp.status}`;
      if (errText.toLowerCase().includes('model') && !model.endsWith(':3b-instruct')) {
        // fallback to a locally available model
        return callOllama({ prompt, model: 'qwen2.5:3b-instruct' });
      }
      throw new Error(`Ollama error ${resp.status}: ${errText}`);
    }
    return text;
  } catch (e) {
    // return fallback text
    return `{"plan":"Ollama unavailable: ${e.message}", "patches": [], "changedFiles": []}`;
  }
}

module.exports = { callOllama };
