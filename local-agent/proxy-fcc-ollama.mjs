// Proxy combinado: FCC (Claude via free-claude-code) + Ollama.
//   - /api/*          -> Ollama (127.0.0.1:11434)
//   - /v1/* , /health -> FCC (127.0.0.1:8082)
// Uso:
//   node local-agent/proxy-fcc-ollama.mjs
// Depois: ngrok http 11111
//
// O deploy (Supabase/Render) usa este túnel como FCC_BASE_URL/OLLAMA_URL.

import http from "node:http";

const PORT = 11111;
const OLLAMA = "http://127.0.0.1:11434";
const FCC = "http://127.0.0.1:8082";

function forward(target, req, res) {
  const proxyReq = http.request(
    target + req.url,
    { method: req.method, headers: { ...req.headers, host: new URL(target).host } },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ type: "error", error: { type: "proxy_error", message: String(err.message) } }));
  });
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const path = req.url || "/";
  const target = path.startsWith("/api/") ? OLLAMA : FCC;
  if (target === FCC) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization, anthropic-version, ngrok-skip-browser-warning");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
  }
  forward(target, req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy combinado FCC+Ollama rodando em :${PORT}`);
  console.log(`  Ollama -> ${OLLAMA}`);
  console.log(`  FCC    -> ${FCC}`);
});
