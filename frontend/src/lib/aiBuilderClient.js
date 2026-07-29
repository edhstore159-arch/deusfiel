// Lightweight client to interact with backend AI Builder proxy
export async function sendMessage({ message, model, token }) {
  const resp = await fetch('/api/ai-builder/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, model }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Request failed ${resp.status}`);
  }
  return resp.json();
}

// SSE-like streaming via fetch + reader (allows Authorization header)
export async function connectEvents({ token, onEvent, onError }) {
  const controller = new AbortController();
  try {
    const resp = await fetch('/api/ai-builder/events', {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Events request failed ${resp.status}`);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) {
        const lines = part.split('\n').map(l => l.replace(/^data:\s?/, ''));
        for (const l of lines) {
          if (!l) continue;
          try {
            const obj = JSON.parse(l);
            onEvent && onEvent(obj);
          } catch (e) {
            onEvent && onEvent({ type: 'raw', data: l });
          }
        }
      }
    }
  } catch (e) {
    onError && onError(e);
  }

  return () => controller.abort();
}
