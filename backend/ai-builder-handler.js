import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b-instruct";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function safeReadProjectContext() {
  const folders = ["src", "backend", "local-agent"];
  const files = [];

  for (const folder of folders) {
    const full = path.join(PROJECT_ROOT, folder);
    if (!fs.existsSync(full)) continue;

    const walk = (dir) => {
      for (const item of fs.readdirSync(dir)) {
        const p = path.join(dir, item);
        const rel = path.relative(PROJECT_ROOT, p);

        if (
          rel.includes("node_modules") ||
          rel.includes(".git") ||
          rel.includes("dist") ||
          rel.includes("build")
        ) continue;

        const stat = fs.statSync(p);
        if (stat.isDirectory()) walk(p);
        else if (/\.(js|jsx|ts|tsx|json|css|md)$/.test(item)) files.push(rel);
      }
    };

    walk(full);
  }

  return files.slice(0, 80);
}

async function callOllama(prompt, projectFiles) {
  const body = {
    model: OLLAMA_MODEL,
    stream: false,
    prompt: `
You are an AI Builder inside a legal dashboard project.

User request:
${prompt}

Project files:
${projectFiles.join("\n")}

Return JSON only with this shape:
{
  "overview": "short implementation plan",
  "files": [],
  "patches": [],
  "next_steps": []
}

Important:
- Do not apply changes.
- Generate preview only.
- Keep it read-only.
`
  };

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || "";
}

async function buildPlan(prompt, onProgress) {
  onProgress("received_prompt", "Prompt recebido");

  onProgress("analyzing_project", "Lendo estrutura do projeto");
  const projectFiles = safeReadProjectContext();

  onProgress("calling_ollama", "Chamando Ollama local");
  const output = await callOllama(prompt, projectFiles);

  onProgress("receiving_model_output", "Resposta recebida do modelo");
  onProgress("generating_plan", "Gerando plano");

  let parsed;
  try {
    const cleaned = output.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      overview: output,
      files: [],
      patches: [],
      next_steps: [
        "Revisar o plano gerado",
        "Confirmar arquivos antes de aplicar qualquer alteração",
      ],
    };
  }

  onProgress("preparing_files", "Preparando preview read-only");

  return {
    overview: parsed.overview || "Plano gerado pelo AI Builder.",
    files: parsed.files || [],
    patches: parsed.patches || [],
    next_steps: parsed.next_steps || [],
    read_only: true,
  };
}

function registerAiBuilderRoutes(app) {
  app.post("/api/ai-builder/message", async (req, res) => {
    try {
      const prompt = req.body?.prompt || req.body?.message || "";
      if (!prompt.trim()) {
        return res.status(400).json({ error: "Prompt obrigatório" });
      }

      const result = await buildPlan(prompt, () => {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || "AI Builder error" });
    }
  });

  app.get("/api/ai-builder/events", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const prompt = req.query?.prompt || "";
      if (!prompt.trim()) {
        sendSse(res, "error", { type: "error", message: "Prompt obrigatório" });
        return res.end();
      }

      const result = await buildPlan(prompt, (type, message) => {
        sendSse(res, "progress", { type, message });
      });

      sendSse(res, "result", result);
      res.end();
    } catch (err) {
      sendSse(res, "error", {
        type: "error",
        message: err.message || "AI Builder error",
      });
      res.end();
    }
  });
}

export { registerAiBuilderRoutes };
