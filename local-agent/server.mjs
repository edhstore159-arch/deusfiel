// Local Agent — executa comandos shell a pedido da bolinha da atendente virtual.
// Uso:
//   node local-agent/server.mjs
// Depois clique na bolinha no app: ela faz POST http://localhost:7777/run
//
// SEGURANÇA: este servidor escuta APENAS em 127.0.0.1 e só aceita comandos
// que estejam na allowlist abaixo. Não exponha para a internet.

import http from "node:http";
import { exec } from "node:child_process";

const PORT = 7777;
const HOST = "127.0.0.1";

// Apenas estes comandos são permitidos. Edite à vontade.
const ALLOWED = {
  "ngrok-restart": "pkill ngrok; sleep 1; ngrok http 11434 > /tmp/ngrok.log 2>&1 &",
};

// Liste aqui as origens do seu app Lovable que podem chamar o agente.
const ALLOWED_ORIGINS = [
  "https://id-preview--d7f915e3-17eb-4f57-a292-74e7422a0161.lovable.app",
  "https://escritorio-kenia.lovable.app",
  "https://d7f915e3-17eb-4f57-a292-74e7422a0161.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:8080",
];

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = http.createServer((req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, commands: Object.keys(ALLOWED) }));
  }

  if (req.method === "POST" && req.url === "/run") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let payload = {};
      try {
        payload = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "invalid JSON" }));
      }

      const name = payload.command;
      const cmd = ALLOWED[name];
      if (!cmd) {
        res.writeHead(403, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            ok: false,
            error: `command "${name}" not allowed`,
            allowed: Object.keys(ALLOWED),
          })
        );
      }

      console.log(`[local-agent] executando: ${name} -> ${cmd}`);
      exec(cmd, { shell: "/bin/bash" }, (err, stdout, stderr) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: !err,
            code: err?.code ?? 0,
            stdout,
            stderr,
          })
        );
      });
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not found" }));
});

server.listen(PORT, HOST, () => {
  console.log(`[local-agent] ouvindo em http://${HOST}:${PORT}`);
  console.log(`[local-agent] comandos permitidos: ${Object.keys(ALLOWED).join(", ")}`);
});
