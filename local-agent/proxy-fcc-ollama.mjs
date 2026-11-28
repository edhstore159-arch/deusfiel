// Proxy combinado: FCC (Claude via free-claude-code) + Ollama.
//   - /api/*          -> Ollama (127.0.0.1:11434)
//   - /v1/* , /health -> FCC (127.0.0.1:8082)
// Uso:
//   node local-agent/proxy-fcc-ollama.mjs
// Depois: ngrok http 11111  (NUNCA aponte o ngrok direto para 11434)
//
// O deploy (Supabase/Render) usa este túnel como FCC_BASE_URL/OLLAMA_URL.

import http from "node:http";

const PORT = 11111;
const OLLAMA = "http://127.0.0.1:11434";
const FCC = "http://127.0.0.1:8082";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type, x-api-key, Authorization, anthropic-version, ngrok-skip-browser-warning, apikey",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function forward(target, req, res) {
  const headers = { ...req.headers, host: new URL(target).host };
  if (target === OLLAMA) {
    // O Ollama bloqueia Host/Origin externos (proteção contra DNS rebinding).
    // O proxy fala com ele como localhost e devolve o CORS para o navegador.
    delete headers.origin;
    delete headers.referer;
  }
  const proxyReq = http.request(
    target + req.url,
    { method: req.method, headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, { ...proxyRes.headers, ...CORS_HEADERS });
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { ...CORS_HEADERS, "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ type: "error", error: { type: "proxy_error", message: String(err.message) } }));
  });
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const path = req.url || "/";
  const target = path.startsWith("/api/") ? OLLAMA : FCC;
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  forward(target, req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy combinado FCC+Ollama rodando em :${PORT}`);
  console.log(`  Ollama -> ${OLLAMA} (Host reescrito + CORS liberado)`);
  console.log(`  FCC    -> ${FCC} (CORS liberado)`);
});
