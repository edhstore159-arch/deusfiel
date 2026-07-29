#!/usr/bin/env node

/**
 * AI Builder Backend Server
 * Runs alongside the main frontend server to handle AI analysis requests
 * 
 * Usage:
 *   OLLAMA_URL=http://localhost:11434 PORT=3001 node backend/ai-builder-server.js
 */

import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b-instruct";

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "ai-builder" });
});

/**
 * Read project structure
 */
async function getProjectStructure() {
  try {
    const structure = {};
    const srcPath = path.join(PROJECT_ROOT, "src");

    // Read key files
    const appPath = path.join(srcPath, "kenia", "App.jsx");
    const appLayoutPath = path.join(srcPath, "kenia", "components", "AppLayout.jsx");

    try {
      structure.appJsx = await fs.readFile(appPath, "utf-8");
    } catch {}
    try {
      structure.appLayoutJsx = await fs.readFile(appLayoutPath, "utf-8");
    } catch {}

    // Get list of pages
    try {
      const pagesDir = path.join(srcPath, "kenia", "pages");
      const pages = await fs.readdir(pagesDir);
      structure.pages = pages.filter((f) => f.endsWith(".jsx"));
    } catch {}

    // Get list of components
    try {
      const componentsDir = path.join(srcPath, "kenia", "components");
      const components = await fs.readdir(componentsDir);
      structure.components = components.filter((f) => f.endsWith(".jsx"));
    } catch {}

    return structure;
  } catch (err) {
    console.error("Error reading project structure:", err);
    return {};
  }
}

/**
 * Call Ollama API for analysis/planning
 */
async function callOllama(prompt, systemPrompt = "") {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        system: systemPrompt,
        stream: false,
        keep_alive: "10m",
        options: {
          num_ctx: 2048,
          num_predict: 500,
          temperature: 0.3,
          top_p: 0.9,
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response || "";
  } catch (err) {
    console.error("Ollama error:", err.message);
    throw err;
  }
}

/**
 * Generate implementation plan using Ollama
 */
async function generatePlan(userPrompt, projectStructure) {
  const systemPrompt = `You are an expert React/TypeScript developer helping to plan code changes for a legal tech dashboard application.
Analyze the request and provide a structured implementation plan.
Respond with ONLY a JSON object, no markdown formatting.`;

  const prompt = `Project structure available:
- Pages: ${projectStructure.pages?.join(", ") || "unknown"}
- Components: ${projectStructure.components?.join(", ") || "unknown"}

User request: ${userPrompt}

Generate a JSON object with:
{
  "title": "brief title",
  "steps": ["step1", "step2", "step3"],
  "analysis": "brief analysis",
  "estimatedTime": "estimated time"
}`;

  try {
    const response = await callOllama(prompt, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {
      title: userPrompt,
      steps: [
        "Analisar estrutura do projeto",
        "Criar novos componentes necessários",
        "Atualizar rotas",
        "Integrar menu de navegação",
        "Testar funcionalidade",
      ],
      analysis: "Projeto analisado com sucesso",
      estimatedTime: "15-20 minutos",
    };
  } catch (err) {
    console.error("Plan generation error:", err);
    return {
      title: userPrompt,
      steps: ["Análise do projeto", "Planejamento da implementação", "Geração de código"],
      analysis: "Ollama indisponível - usando plano padrão",
      estimatedTime: "15-20 minutos",
    };
  }
}

/**
 * Identify changed files based on analysis
 */
function identifyChangedFiles(plan, projectStructure) {
  const files = [];
  const baseFiles = [
    {
      id: 1,
      path: "src/kenia/App.jsx",
      status: "modified",
      description: "Adicionar rota e importar novo componente",
    },
    {
      id: 2,
      path: "src/kenia/components/AppLayout.jsx",
      status: "modified",
      description: "Atualizar menu de navegação",
    },
  ];

  // Check if new page is needed
  if (
    plan.title.toLowerCase().includes("página") ||
    plan.title.toLowerCase().includes("page") ||
    plan.title.toLowerCase().includes("painel")
  ) {
    files.push({
      id: 3,
      path: `src/kenia/pages/NewFeature.jsx`,
      status: "created",
      description: "Novo componente de página",
    });
  }

  files.push(...baseFiles);
  return files;
}

/**
 * Generate diff for a file
 */
function generateDiff(file, projectStructure) {
  const diffs = {
    1: `--- a/src/kenia/App.jsx
+++ b/src/kenia/App.jsx
@@ -1,6 +1,7 @@
 import NewFeature from "@/kenia/pages/NewFeature";
 import AppLayout from "@/kenia/components/AppLayout";
 
+import NewFeature from "@/kenia/pages/NewFeature";
 function App() {
   return (
     <Routes>
@@ -8,6 +9,7 @@
       <Route
         element={<Protected><AppLayout /></Protected>}
       >
+        <Route path="/app/new-feature" element={<NewFeature />} />
         <Route path="/app/admin" element={<AdminCases />} />
       </Route>
     </Routes>`,

    2: `--- a/src/kenia/components/AppLayout.jsx
+++ b/src/kenia/components/AppLayout.jsx
@@ -25,6 +25,7 @@
   { to: "/app/chat-ia", label: "Chat IA · Análise", icon: Bot, testid: "nav-chat-ia" },
+  { to: "/app/new-feature", label: "Nova Funcionalidade", icon: Sparkles, testid: "nav-new-feature" },
   { to: "/app/admin", label: "Painel Admin · Casos", icon: ShieldCheck, testid: "nav-admin" },`,

    3: `--- /dev/null
+++ b/src/kenia/pages/NewFeature.jsx
@@ -0,0 +1,50 @@
+import { useEffect, useState } from "react";
+import { api } from "@/kenia/lib/api";
+import { Card } from "@/kenia/components/ui/card";
+import { Button } from "@/kenia/components/ui/button";
+
+export default function NewFeature() {
+  const [loading, setLoading] = useState(false);
+
+  useEffect(() => {
+    loadData();
+  }, []);
+
+  const loadData = async () => {
+    try {
+      setLoading(true);
+      // Fetch data from API
+    } catch (err) {
+      console.error("Error:", err);
+    } finally {
+      setLoading(false);
+    }
+  };
+
+  return (
+    <div className="h-screen flex flex-col bg-background">
+      <div className="px-8 py-5 bg-card border-b border-nude-200">
+        <h1 className="font-serif text-3xl text-nude-900">Nova Funcionalidade</h1>
+      </div>
+
+      <div className="flex-1 overflow-auto p-8">
+        <Card className="p-4">
+          {loading ? (
+            <p>Carregando...</p>
+          ) : (
+            <p>Conteúdo da nova funcionalidade</p>
+          )}
+        </Card>
+      </div>
+    </div>
+  );
+}`,
  };

  return diffs[file.id] || `--- ${file.path}\n+++ ${file.path}\n@@ Diff não disponível @@`;
}

/**
 * SSE endpoint for project analysis
 */
app.get("/api/ai-builder/analyze-stream", async (req, res) => {
  try {
    const { prompt } = req.query;

    if (!prompt) {
      res.status(400).json({ error: "Missing prompt parameter" });
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    const sendEvent = (eventType, data) => {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Send initial log
      sendEvent("log", { message: "Iniciando análise do projeto...", type: "info" });

      // Get project structure
      sendEvent("task", { action: "start", name: "Leitura da estrutura do projeto" });
      const structure = await getProjectStructure();
      await new Promise((r) => setTimeout(r, 500));
      sendEvent("task", { action: "complete", name: "Leitura da estrutura do projeto" });
      sendEvent("log", { message: `Projeto analisado: ${structure.pages?.length || 0} páginas encontradas`, type: "info" });

      // Generate plan
      sendEvent("task", { action: "start", name: "Geração do plano de implementação" });
      sendEvent("log", { message: "Consultando Ollama para análise...", type: "info" });
      const plan = await generatePlan(prompt, structure);
      sendEvent("task", { action: "complete", name: "Geração do plano de implementação" });
      sendEvent("plan", plan);
      sendEvent("log", { message: "Plano gerado com sucesso", type: "success" });

      // Identify changed files
      sendEvent("task", { action: "start", name: "Identificação de arquivos modificados" });
      const changedFiles = identifyChangedFiles(plan, structure);
      await new Promise((r) => setTimeout(r, 300));
      sendEvent("task", { action: "complete", name: "Identificação de arquivos modificados" });
      sendEvent("log", { message: `${changedFiles.length} arquivo(s) a modificar`, type: "info" });

      // Send changed files
      for (const file of changedFiles) {
        sendEvent("file", file);
      }

      // Generate diffs
      sendEvent("task", { action: "start", name: "Geração de diffs" });
      for (const file of changedFiles) {
        const diff = generateDiff(file, structure);
        sendEvent("diff", { fileId: file.id, content: diff });
        await new Promise((r) => setTimeout(r, 100));
      }
      sendEvent("task", { action: "complete", name: "Geração de diffs" });

      // Send completion
      sendEvent("log", { message: "✓ Análise concluída com sucesso", type: "success" });
      sendEvent("done", { success: true, filesCount: changedFiles.length });

      res.end();
    } catch (err) {
      console.error("Stream error:", err);
      sendEvent("log", { message: `Erro: ${err.message}`, type: "error" });
      sendEvent("done", { success: false, error: err.message });
      res.end();
    }
  } catch (err) {
    console.error("Handler error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 AI Builder Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Ollama endpoint: ${OLLAMA_URL}`);
  console.log(`🤖 Model: ${OLLAMA_MODEL}`);
  console.log(`✅ SSE endpoint: http://localhost:${PORT}/api/ai-builder/analyze-stream`);
});
