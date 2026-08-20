import { useState, useRef, useEffect, useCallback, Component } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import {
  Send, Loader2, Code2, Eye, FileCode, Download,
  MessageSquare, FolderTree, ExternalLink, Trash2, Copy, Sparkles,
  MousePointer2, ImagePlus, Save, Globe, Wrench, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, Undo2, Eraser, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "site-builder:state";

const FCC_MODEL = import.meta.env.VITE_FCC_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";
const FCC_DIRECT_URL = import.meta.env.VITE_FCC_URL || "https://fcc-server.onrender.com";

const SITE_SYSTEM_PROMPT = `# SISTEMA DE GERAÇÃO DE SITES PROFISSIONAIS

Você é um **gerador de sites profissional de nível agência**, com qualidade visual e experiência semelhante aos melhores sites do mundo. Seu objetivo é criar um **site completo, profissional, personalizado, responsivo, visualmente rico e pronto para publicação** — que pareça ter sido desenvolvido por uma agência premium de design.

---

## REGRA PRINCIPAL

Nunca entregue um site genérico, vazio ou com aparência de template básico. Cada site precisa parecer que foi criado **especificamente** para aquele negócio. Antes de gerar, analise: segmento, público-alvo, objetivo, identidade visual, serviços/produtos, tom da marca e informações fornecidas.

---

## 1. IDENTIDADE VISUAL

Crie uma identidade visual coerente com o segmento. Defina automaticamente:
- Paleta de cores (primary, secondary, background, surface, text, muted, border, accent)
- Tipografia (fontes modernas adequadas ao segmento; H1, H2, H3, body, small, button)
- Hierarquia de títulos
- Estilo de imagens e ícones
- Bordas, sombras, espaçamentos, formas
- Elementos gráficos e estilo dos botões

Evite combinações de cores aleatórias e aparência de template pronto. A identidade deve ser consistente em todas as seções.

---

## 2. ESTRUTURA DO SITE

Crie a arquitetura mais adequada ao tipo de projeto. Quando fizer sentido, inclua:
Header, Hero, Apresentação da marca, Produtos/serviços, Benefícios, Diferenciais, Como funciona, Portfólio, Depoimentos, Cases, Estatísticas, Equipe, FAQ, Blog, CTA, Contato, Footer.

**Não force todas essas seções.** Escolha somente as que fazem sentido para o segmento e objetivo.

---

## 3. HERO SECTION

A primeira tela deve comunicar imediatamente:
- O que é a empresa/projeto + valor oferecido + por que continuar

Criar:
- Headline forte e específica
- Subheadline clara
- CTA principal + CTA secundário quando necessário
- Elemento visual relevante

**NUNCA** use textos genéricos como "Bem-vindo ao nosso site" ou "Soluções completas para seu negócio".

---

## 4. EXPERIÊNCIA DO USUÁRIO

Priorize: Clareza, Simplicidade, Hierarquia visual, Navegação intuitiva, Poucos cliques, Boa legibilidade, Conversão, Acessibilidade.

O visitante deve saber facilmente: onde está, o que a empresa oferece, por que confiar, qual é o próximo passo.

---

## 5. DESIGN

Princípios modernos:
- Grid consistente, espaçamento generoso, alinhamento preciso
- Contraste adequado, hierarquia tipográfica, composição equilibrada
- Ritmo visual, elementos de destaque

Crie seções **visualmente diferentes entre si**, mas com mesma identidade. Evite sequências de caixas/cards idênticos. Utilize layouts editoriais, grids assimétricos e composições diferenciadas quando fizer sentido.

---

## 6. IMAGENS

Imagens devem ser: Profissionais, Relevantes, Modernas, De alta qualidade, Coerentes entre si.

Use URLs completas do https://picsum.photos com seed contextual (ex: https://picsum.photos/seed/restaurante-prato/800/600). Nunca use caminhos relativos, placeholders como solução final, imagens quebradas ou URLs inexistentes.

---

## 7. COMPONENTES

Crie componentes consistentes para: Botões, Cards, Inputs, Menus, Modais, Depoimentos, Badges, Tags, FAQ, Navegação, Formulários. Todos devem seguir o mesmo sistema visual.

---

## 8. MICROINTERAÇÕES

Animações modernas e discretas: Hover, Fade-in, Transições suaves, Scroll reveal, Feedback visual em botões, Estados de carregamento. Respeite prefers-reduced-motion.

---

## 9. RESPONSIVIDADE

O site deve funcionar perfeitamente em Desktop, Notebook, Tablet e Smartphone.

No mobile: Menu hambúrguer, tipografia adaptada, imagens responsivas, botões fáceis de tocar, espaçamentos adequados, seções reorganizadas, nenhum overflow horizontal. **Não reduza o layout desktop — redesenhe para telas menores.**

---

## 10. CONVERSÃO

Identifique o principal objetivo do site (comprar, agendar, orçamento, contato, cadastro, download, demonstração, visita, contratação). CTAs devem aparecer naturalmente na jornada. Evite excesso de CTAs.

---

## 11. CONTEÚDO

Textos profissionais e específicos para o segmento. **NUNCA** use:
- Lorem ipsum
- Frases genéricas como "Soluções inovadoras" ou "Qualidade que você pode confiar"
- Textos repetitivos
- "Welcome to our website"

Se faltarem informações, crie conteúdo profissional provisório coerente. Nunca invente avaliações, números ou resultados reais.

---

## 12. ACESSIBILIDADE

Contraste adequado, textos legíveis, labels nos formulários, alt text, navegação por teclado, estados de foco, estrutura semântica, botões claramente identificáveis.

---

## 13. SEO

Estrutura semântica, H1 único por página, H2/H3 organizados, Meta title, Meta description, Alt text, Open Graph, Performance otimizada.

---

## 14. PERFORMANCE

Carregamento rápido, imagens otimizadas (lazy loading), código limpo, CSS otimizado, JavaScript somente quando necessário. Não adicione efeitos que prejudiquem velocidade.

---

## 15. DIFERENCIAÇÃO

O site deve ter personalidade. Crie pelo menos 3 elementos de diferenciação visual adequados ao segmento, como: Hero exclusivo, composição editorial, elementos gráficos personalizados, animação própria, sistema de cards diferenciado, tipografia marcante, seção interativa, uso criativo de imagens, layout assimétrico.

---

## 16. REVISÃO FINAL

Antes de concluir, faça revisão como diretor de arte: alinhamento, espaçamento, tipografia, contraste, cores, consistência, responsividade, hierarquia, legibilidade, CTAs, navegação, formulários, estados hover/foco. Corrija automaticamente qualquer problema.

---

## REGRA FINAL

Não quero um site que apenas funcione. Quero um site que pareça **profissional, atual, confiável, sofisticado e pensado especificamente para o negócio**.

Adapte completamente o design ao contexto:
- Restaurante → pareça restaurante premium
- Tecnologia → pareça tecnológico
- Advocacia → transmita autoridade
- Clínica → transmita confiança e cuidado
- Loja → priorize produtos e conversão
- Portfólio → destaque o trabalho
- Imobiliária → valorize os imóveis

O segmento, público e objetivo devem determinar o design. Entregue uma experiência visual **significativamente superior** a um template comum.

---

## CÓPIA EXATA DE REFERÊNCIA (REGRAS INEGOCIÁVEIS)

**PRIORIDADE MÁXIMA: Quando receber "SITE DE REFERÊNCIA" no prompt, as regras abaixo são OBRIGATÓRIAS e INEGOCIÁVEIS.**

O site que você gerar DEVE ser visualmente IDÊNTICO ao site de referência. NÃO invente design. NÃO crie layout genérico. NÃO mude cores. NÃO mude fontes. COPIE FIELMENTE.

### O que copiar EXATAMENTE:
1. **CORES** — Use as mesmas cores hex listadas. Não troque por cores similares.
2. **FONTES** — Use as mesmas famílias de fonte. Se não detectou, use Google Fonts modernas do nicho.
3. **SEÇÕES** — Siga EXATAMENTE a ordem listada. Não reordene, não adicione, não remova.
4. **TÍTULOS** — Use os mesmos textos de títulos. Adapte levemente se necessário, mas mantenha o tom.
5. **TEXTOS** — Use os textos de parágrafo como base para o conteúdo.
6. **BOTÕES** — Use os mesmos textos de botões/CTAs.
7. **NAVEGAÇÃO** — Use os mesmos links de navegação.
8. **ESTILO VISUAL** — Copie bordas, sombras, gradientes, animações e responsividade.
9. **FUNDO** — Se a referência tem fundo escuro, use escuro. Se gradiente, use gradiente.

### PROIBIDO:
- NÃO usar fundo branco se a referência tem fundo escuro
- NÃO trocar cores "porque ficou mais bonito"
- NÃO simplificar o layout "para ficar mais limpo"
- NÃO mudar a ordem das seções
- NÃO remover seções que existem na referência
- NÃO adicionar seções que não existem na referência
- NÃO usar fontes diferentes das listadas
- NÃO ignorar o bloco "SITE DE REFERÊNCIA" — ele é OBRIGATÓRIO

---

## FORMATO DE RESPOSTA (OBRIGATÓRIO)

Responda APENAS com o código completo e funcional, organizado em blocos:

### index.html
\`\`\`html
...
\`\`\`

### styles.css
\`\`\`css
...
\`\`\`

### script.js
\`\`\`js
...
\`\`\`

- Nunca responda com texto corrido: SEMPRE entregue o código completo em blocos.
- No máximo 1 linha curta de explicação antes dos blocos.`;

const PROVIDERS = [
  { id: "opencode", label: "OpenCode", desc: "Zen (gratuito)", color: "#2563eb" },
  { id: "ollama", label: "llama.cpp", desc: "Local (gratuito)", color: "#7c3aed" },
  { id: "fcc", label: "Claude FCC", desc: "free-claude-code", color: "#d97706" },
  { id: "emergent", label: "Emergent", desc: "GPT-4o (gratis)", color: "#059669" },
];

const OPENCODE_MODELS = [
  { id: "big-pickle", label: "Big Pickle", desc: "Gratuito" },
  { id: "nemotron-3-ultra-free", label: "Nemotron Ultra", desc: "Gratuito" },
  { id: "deepseek-v4-flash-free", label: "DeepSeek V4", desc: "Gratuito" },
  { id: "hy3-free", label: "Hy3", desc: "Gratuito" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", desc: "Anthropic" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "Anthropic rápido" },
  { id: "gpt-5", label: "GPT-5", desc: "OpenAI" },
  { id: "gpt-5.5", label: "GPT-5.5", desc: "OpenAI avançado" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", desc: "Google" },
  { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro", desc: "Google premium" },
  { id: "grok-4.5", label: "Grok 4.5", desc: "xAI" },
];

const OLLAMA_MODELS = [
  { id: "qwen2.5:3b-instruct", label: "Qwen 2.5 3B", desc: "Rápido" },
  { id: "gemma4:12b", label: "Gemma 4 12B", desc: "Google" },
  { id: "qwen-hermes:latest", label: "Qwen Hermes", desc: "Chat" },
];

async function callClaudeFCC(messages) {
  const { data, error } = await supabase.functions.invoke("fcc-proxy", {
    timeout: 300000,
    body: {
      provider: "fcc",
      model: FCC_MODEL,
      max_tokens: 8000,
      system: SITE_SYSTEM_PROMPT,
      messages: messages.filter((m) => m.role !== "system"),
    },
  });
  if (data?.error) {
    throw new Error(`Claude FCC: ${data.error}`);
  }
  if (error) {
    throw new Error(`Claude FCC: ${error.message}`);
  }
  const blocks = (data?.content || []);
  const textBlocks = blocks.filter((b) => b.type === "text").map((b) => b.text || "").join("\n").trim();
  const thinkingText = blocks.filter((b) => b.type === "thinking").map((b) => b.thinking || "").join("\n").trim();
  const text = textBlocks || thinkingText;
  if (!text) throw new Error("Claude FCC retornou resposta vazia");
  return text;
}


async function callOpenCode(messages, model) {
  const { data, error } = await supabase.functions.invoke("fcc-proxy", {
    timeout: 300000,
    body: {
      provider: "opencode",
      model: model || undefined,
      max_tokens: 8000,
      system: SITE_SYSTEM_PROMPT,
      messages: messages.filter((m) => m.role !== "system"),
    },
  });
  if (data?.error) {
    throw new Error(`OpenCode: ${data.error}`);
  }
  if (error) {
    throw new Error(`OpenCode: ${error.message}`);
  }
  const text = (data?.choices?.[0]?.message?.content || data?.content?.[0]?.text || "").trim();
  if (!text) throw new Error("OpenCode retornou resposta vazia");
  return text;
}

async function callEmergent(messages, model) {
  const { data, error } = await supabase.functions.invoke("fcc-proxy", {
    timeout: 300000,
    body: {
      provider: "emergent",
      model: model || "gpt-4o",
      max_tokens: 8000,
      system: SITE_SYSTEM_PROMPT,
      messages: messages.filter((m) => m.role !== "system"),
    },
  });
  if (data?.error) {
    throw new Error(`Emergent: ${data.error}`);
  }
  if (error) {
    throw new Error(`Emergent: ${error.message}`);
  }
  const text = (data?.choices?.[0]?.message?.content || data?.content?.[0]?.text || "").trim();
  if (!text) throw new Error("Emergent retornou resposta vazia");
  return text;
}

async function callOllama(messages, model) {
  const { data, error } = await supabase.functions.invoke("fcc-proxy", {
    timeout: 300000,
    body: {
      provider: "ollama",
      model: model || "qwen2.5:3b-instruct",
      max_tokens: 8000,
      system: SITE_SYSTEM_PROMPT,
      messages: messages.filter((m) => m.role !== "system"),
    },
  });
  if (data?.error) {
    throw new Error(`Ollama: ${data.error}`);
  }
  if (error) {
    throw new Error(`Ollama: ${error.message}`);
  }
  const text = (data?.choices?.[0]?.message?.content || data?.content?.[0]?.text || "").trim();
  if (!text) throw new Error("Ollama retornou resposta vazia");
  return text;
}

function parseFilesFromCode(text) {
  const files = {};
  const order = [];

  const assign = (name, code) => {
    const clean = String(code || "").replace(/\n+$/, "").trim();
    if (!clean) return;
    if (!files[name]) {
      files[name] = clean;
      order.push(name);
    }
  };

  const guessName = (lang) => {
    if (!lang) return "";
    const l = lang.toLowerCase();
    if (l.includes("html")) return "index.html";
    if (l.includes("css")) return "styles.css";
    if (l.includes("js")) return order.includes("script.js") ? "app.js" : "script.js";
    if (l.includes("ts")) return "app.js";
    return "";
  };

  const nameFromHeader = (header) => {
    const m = String(header || "").match(/(?:[a-zA-Z0-9_\-./]+\/)*([a-zA-Z0-9_\-]+\.(?:html?|css|js|ts))/i);
    return m ? m[1].toLowerCase() : "";
  };

const blockRe = /```([a-zA-Z0-9_\-+]*)\s*\n([\s\S]*?)```/g;

  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const lang = (m[1] || "").toLowerCase();
    const code = m[2];
    const before = text.slice(0, m.index);
    let name = "";
    let lastHeader = "";
    const hRe = /^#{1,4}\s*(.+)$/gm;
    let hh;
    while ((hh = hRe.exec(before)) !== null) lastHeader = hh[1];
    if (lastHeader) name = nameFromHeader(lastHeader);
    if (!name && lang) name = guessName(lang);
    if (!name && /<!DOCTYPE|^<html/i.test(code.trim())) name = "index.html";
    if (name) {
      assign(name, code);
    }
  }

  if (!files["index.html"]) {
    const bareHtml = (text || "").replace(/```[\s\S]*?```/g, "");
    if (/<!DOCTYPE/i.test(bareHtml) || /^<html[\s>]/i.test(bareHtml.trim())) {
      assign("index.html", bareHtml);
    }
  }

  if (Object.keys(files).length === 0) {
    const bare = (text || "").replace(/```[\s\S]*?```/g, "").trim();
    if (bare) {
      assign("index.html", buildStyledFallback(bare));
    }
  }

  if (Object.keys(files).length > 0 && !files["index.html"]) {
    assign("index.html", "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Meu Site</title>\n</head>\n<body>\n</body>\n</html>");
  }

  return files;
}

function buildStyledFallback(text) {
  const lines = String(text || "").split("\n").filter((l) => l.trim());
  const title = lines[0]?.replace(/^#+\s*/, "").trim() || "Meu Site";
  const body = lines.slice(1).join("\n") || text;
  const paragraphs = String(body)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #312e81 100%); min-height: 100vh; color: #e2e8f0; line-height: 1.7; }
main { max-width: 860px; margin: 0 auto; padding: 72px 24px; }
h1 { font-size: clamp(1.8rem, 5vw, 3rem); font-weight: 800; letter-spacing: -0.03em; background: linear-gradient(135deg, #60a5fa, #a78bfa); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 32px; }
p { margin-bottom: 16px; font-size: 1.05rem; color: #cbd5e1; }
.card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 28px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,.25); }
</style>
</head>
<body>
<main>
<div class="card">
<h1>${title}</h1>
${paragraphs}
</div>
</main>
</body>
</html>`;
}

const DEFAULT_CSS = `:root { --accent: #2563eb; --accent2: #7c3aed; --ink: #0f172a; --muted: #64748b; --bg: #f8fafc; --card: #ffffff; --radius: 16px; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--ink); line-height: 1.6; -webkit-font-smoothing: antialiased; }
h1, h2, h3 { color: var(--ink); line-height: 1.2; font-weight: 800; letter-spacing: -0.02em; }
h1 { font-size: clamp(2rem, 5vw, 3.2rem); background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
h2 { font-size: clamp(1.5rem, 3vw, 2.2rem); margin-bottom: 1rem; }
button, .btn { cursor: pointer; border: none; border-radius: 999px; padding: 12px 26px; font-size: 1rem; font-weight: 600; color: #fff; background: linear-gradient(135deg, var(--accent), var(--accent2)); box-shadow: 0 8px 24px rgba(37,99,235,.3); transition: all .25s ease; }
button:hover, .btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(37,99,235,.45); }
a { color: var(--accent); text-decoration: none; }
img { max-width: 100%; height: auto; border-radius: var(--radius); }
.container { max-width: 1140px; margin: 0 auto; padding: 0 24px; }
section { padding: 90px 24px; }
.card, [class*="card"] { background: var(--card); border: 1px solid #e2e8f0; border-radius: var(--radius); padding: 28px; box-shadow: 0 4px 20px rgba(2,6,23,.06); transition: all .3s ease; }
.card:hover, [class*="card"]:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(2,6,23,.12); }
nav, header { background: rgba(255,255,255,.8); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid rgba(226,232,240,.7); position: sticky; top: 0; z-index: 50; }
nav a, header a { font-weight: 600; padding: 8px 14px; border-radius: 8px; transition: background .2s; }
nav a:hover, header a:hover { background: rgba(37,99,235,.08); }
.hero { display: grid; place-items: center; text-align: center; min-height: 78vh; padding: 60px 24px; background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,.12), transparent), linear-gradient(180deg, #fdfdff, var(--bg)); }
.hero p { font-size: 1.15rem; color: var(--muted); max-width: 640px; margin: 0 auto 2rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.hero, section > * { animation: fadeUp .6s ease both; }
@media (max-width: 768px) { section { padding: 56px 18px; } .hero { min-height: auto; padding: 64px 20px; } }`;

const stripThemeBlock = (css) => {
  const idx = String(css || "").indexOf("/* TEMA:");
  return idx === -1 ? css : String(css).slice(0, idx).trim();
};

const THEMES = [
  { id: "none", label: "Sem tema" },
  { id: "moderno", label: "Moderno", css: `body { background: #f8fafc !important; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important; color: #0f172a !important; }
h1, h2, h3 { font-weight: 800 !important; letter-spacing: -0.03em !important; color: #0f172a !important; }
h1 { background: linear-gradient(135deg, #2563eb, #7c3aed) !important; -webkit-background-clip: text !important; background-clip: text !important; -webkit-text-fill-color: transparent !important; }
button, .btn, [class*="button"] { background: linear-gradient(135deg, #2563eb, #7c3aed) !important; color: #fff !important; border-radius: 999px !important; box-shadow: 0 8px 24px rgba(37,99,235,.35) !important; border: none !important; }
.card, [class*="card"] { background: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 16px !important; box-shadow: 0 4px 20px rgba(2,6,23,.08) !important; }
nav, header { background: rgba(255,255,255,.85) !important; backdrop-filter: blur(14px) !important; -webkit-backdrop-filter: blur(14px) !important; border-bottom: 1px solid rgba(226,232,240,.7) !important; }
a { color: #2563eb !important; }` },
  { id: "elegante", label: "Elegante", css: `body { background: #faf6ef !important; font-family: Georgia, 'Times New Roman', serif !important; color: #3b2f22 !important; }
h1, h2, h3 { font-family: Georgia, serif !important; font-weight: 400 !important; letter-spacing: .02em !important; color: #5c3d1e !important; }
h1 { border-bottom: 1px solid #d4af7a !important; padding-bottom: .4em !important; }
button, .btn, [class*="button"] { background: #5c3d1e !important; color: #f5e9d5 !important; border-radius: 2px !important; letter-spacing: .08em !important; text-transform: uppercase !important; font-size: .85rem !important; border: none !important; }
.card, [class*="card"] { background: #fffdf8 !important; border: 1px solid #e4d5bb !important; border-radius: 4px !important; box-shadow: 0 2px 12px rgba(92,61,30,.08) !important; }
nav, header { background: rgba(250,246,239,.9) !important; backdrop-filter: blur(10px) !important; border-bottom: 1px solid #e4d5bb !important; }
a { color: #8a5a2b !important; text-decoration: underline !important; }` },
  { id: "vibrante", label: "Vibrante", css: `body { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%) !important; font-family: 'Poppins', 'Segoe UI', sans-serif !important; color: #fef9e7 !important; }
h1, h2, h3 { font-weight: 800 !important; color: #fbbf24 !important; text-shadow: 0 2px 20px rgba(244,63,94,.5) !important; }
button, .btn, [class*="button"] { background: linear-gradient(135deg, #f43f5e, #f59e0b) !important; color: #fff !important; font-weight: 700 !important; border-radius: 999px !important; box-shadow: 0 10px 30px rgba(244,63,94,.45) !important; border: none !important; }
.card, [class*="card"] { background: rgba(255,255,255,.08) !important; border: 1px solid rgba(255,255,255,.15) !important; border-radius: 20px !important; backdrop-filter: blur(8px) !important; }
nav, header { background: rgba(30,27,75,.7) !important; backdrop-filter: blur(14px) !important; border-bottom: 1px solid rgba(255,255,255,.1) !important; }
a { color: #fbbf24 !important; }` },
  { id: "luxo", label: "Luxo", css: `body { background: #0d0d0d !important; font-family: 'Playfair Display', Georgia, serif !important; color: #e8e0ce !important; }
h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif !important; color: #d4af37 !important; letter-spacing: .05em !important; }
h1 { text-shadow: 0 0 40px rgba(212,175,55,.35) !important; }
button, .btn, [class*="button"] { background: linear-gradient(135deg, #b08d3e, #d4af37) !important; color: #0d0d0d !important; border-radius: 0 !important; letter-spacing: .1em !important; text-transform: uppercase !important; font-family: 'Segoe UI', sans-serif !important; font-weight: 600 !important; border: none !important; }
.card, [class*="card"] { background: linear-gradient(160deg, #161616, #1f1f1f) !important; border: 1px solid #b08d3e55 !important; border-radius: 8px !important; box-shadow: 0 8px 40px rgba(212,175,55,.12) !important; }
nav, header { background: rgba(13,13,13,.8) !important; backdrop-filter: blur(14px) !important; border-bottom: 1px solid rgba(212,175,55,.2) !important; }
a { color: #d4af37 !important; }` },
  { id: "minimalista", label: "Minimalista", css: `body { background: #ffffff !important; font-family: 'Helvetica Neue', Arial, sans-serif !important; color: #111827 !important; }
h1, h2, h3 { font-weight: 300 !important; letter-spacing: .06em !important; color: #111827 !important; }
h1 { text-transform: uppercase !important; }
button, .btn, [class*="button"] { background: #111827 !important; color: #fff !important; border-radius: 0 !important; font-weight: 400 !important; letter-spacing: .1em !important; text-transform: uppercase !important; border: none !important; }
.card, [class*="card"] { background: #fff !important; border: 1px solid #e5e5e5 !important; border-radius: 0 !important; box-shadow: none !important; }
nav, header { background: rgba(255,255,255,.95) !important; border-bottom: 1px solid #e5e5e5 !important; }
a { color: #111827 !important; border-bottom: 1px solid #111827 !important; }` },
  { id: "neon", label: "Neon", css: `body { background: #05060f !important; font-family: 'Inter', 'Segoe UI', sans-serif !important; color: #e2e8f0 !important; }
h1, h2, h3 { font-weight: 900 !important; letter-spacing: -0.02em !important; color: #f1f5f9 !important; }
h1 { background: linear-gradient(135deg, #22d3ee, #a855f7) !important; -webkit-background-clip: text !important; background-clip: text !important; -webkit-text-fill-color: transparent !important; text-shadow: 0 0 60px rgba(34,211,238,.25) !important; }
button, .btn, [class*="button"] { background: transparent !important; border: 1px solid #22d3ee !important; color: #22d3ee !important; border-radius: 10px !important; box-shadow: 0 0 20px rgba(34,211,238,.35), inset 0 0 12px rgba(34,211,238,.15) !important; text-transform: uppercase !important; letter-spacing: .08em !important; font-size: .85rem !important; }
.card, [class*="card"] { background: rgba(255,255,255,.04) !important; border: 1px solid rgba(34,211,238,.25) !important; border-radius: 14px !important; backdrop-filter: blur(10px) !important; box-shadow: 0 0 24px rgba(34,211,238,.08) !important; }
nav, header { background: rgba(5,6,15,.75) !important; backdrop-filter: blur(14px) !important; border-bottom: 1px solid rgba(34,211,238,.2) !important; }
a { color: #22d3ee !important; }` },
  { id: "saude", label: "Bem-estar", css: `body { background: #f0fdf4 !important; font-family: 'Inter', 'Segoe UI', sans-serif !important; color: #14532d !important; }
h1, h2, h3 { font-weight: 800 !important; letter-spacing: -0.02em !important; color: #064e3b !important; }
h1 { background: linear-gradient(135deg, #059669, #34d399) !important; -webkit-background-clip: text !important; background-clip: text !important; -webkit-text-fill-color: transparent !important; }
button, .btn, [class*="button"] { background: linear-gradient(135deg, #059669, #34d399) !important; color: #fff !important; border-radius: 999px !important; box-shadow: 0 8px 24px rgba(5,150,105,.3) !important; border: none !important; }
.card, [class*="card"] { background: #ffffff !important; border: 1px solid #d1fae5 !important; border-radius: 20px !important; box-shadow: 0 4px 20px rgba(5,150,105,.08) !important; }
nav, header { background: rgba(240,253,244,.8) !important; backdrop-filter: blur(14px) !important; border-bottom: 1px solid #d1fae5 !important; }
a { color: #059669 !important; }` },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-50) : [],
      files: parsed.files && typeof parsed.files === "object" ? parsed.files : {},
      activeFile: typeof parsed.activeFile === "string" ? parsed.activeFile : "",
    };
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return {};
  }
}

const IMG_FALLBACK_SCRIPT = `<script>
(function(){
  var ph='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" fill="#94a3b8" font-family="sans-serif" font-size="26" text-anchor="middle">Imagem</text></svg>');
  document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.src&&!t.src.startsWith('data:')){t.src=ph;}},true);
  window.addEventListener('load',function(){document.querySelectorAll('img').forEach(function(i){if(i.complete&&i.naturalWidth===0&&(!i.src||!i.src.startsWith('data:'))){try{i.src=ph;}catch(_){}};});});
})();<\/script>`;

const injectImgFallback = (html) => {
  if (!html) return html;
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, '<head$1>\n' + IMG_FALLBACK_SCRIPT);
  }
  return IMG_FALLBACK_SCRIPT + "\n" + html;
};

const MODERN_IMG_SEEDS = ["empresa","negocio","tecnologia","natureza","cidade","equipe","produto","viagem","arquitetura","moda","esporte","saude","inovacao","criatividade","conexao","sucesso","energia"];

const modernImageUrl = () =>
  `https://picsum.photos/seed/${MODERN_IMG_SEEDS[Math.floor(Math.random() * MODERN_IMG_SEEDS.length)]}${Math.floor(Math.random() * 97) + 1}/800/600`;

function ensureImages(html) {
  if (!html) return html;
  let out = html;
  const relativeSrc = /^(\.\.?\/|[a-z0-9_-]+\.(png|jpe?g|gif|svg|webp|avif)(\?|$))/i;
  const fixUrl = (css) =>
    css.replace(/url\(\s*["']?([^)"']*)["']?\s*\)/gi, (m, u) => {
      const s = String(u || "").trim();
      if (!s || relativeSrc.test(s) || (!/^(https?:|data:|#)/i.test(s) && s !== "none")) return `url('${modernImageUrl()}')`;
      return m;
    });
  out = out.replace(/<img([^>]*?)src=["']([^"']*)["']([^>]*)>/gi, (m, pre, src, post) => {
    const s = String(src || "").trim();
    if (s.startsWith("//")) return `<img${pre}src="https:${s}"${post}>`;
    if (!s || s.startsWith("#") || relativeSrc.test(s) || !/^https?:|data:/i.test(s)) {
      return `<img${pre}src="${modernImageUrl()}"${post}>`;
    }
    return m;
  });
  out = out.replace(/<img([^>]*)>/gi, (m, attrs) => (/src\s*=/.test(attrs) ? m : `<img src="${modernImageUrl()}"${attrs}>`));
  out = out.replace(/(style=["'])([^"']*)(["'])/gi, (m, pre, style, post) => (/url\(/i.test(style) ? pre + fixUrl(style) + post : m));
  out = out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (m, attrs, css) => (/url\(/i.test(css) ? `<style${attrs}>${fixUrl(css)}</style>` : m));
  return out;
}

const RESPONSIVE_CSS = `
/* Responsivo automático */
@media (max-width: 900px) {
  [class*="grid"], [class*="cards"], .row, .features, .services, .team, .gallery, .portfolio, .stats {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .container, [class*="container"], .wrapper, .wrap, .inner, section, .section {
    padding-left: 20px !important;
    padding-right: 20px !important;
  }
  h1 { font-size: 2.4rem !important; }
  h2 { font-size: 1.8rem !important; }
  nav, header, .navbar, .menu, [class*="nav"] { flex-wrap: wrap !important; gap: 8px !important; }
}
@media (max-width: 600px) {
  [class*="grid"], [class*="cards"], .row, .features, .services, .team, .gallery, .portfolio, .stats {
    grid-template-columns: 1fr !important;
  }
  body { font-size: 16px !important; }
  h1 { font-size: 1.9rem !important; }
  h2 { font-size: 1.45rem !important; }
  h3 { font-size: 1.2rem !important; }
  .container, [class*="container"], .wrapper, .wrap, .inner, section, .section {
    padding-left: 16px !important;
    padding-right: 16px !important;
    width: 100% !important;
  }
  img, video, iframe, table { max-width: 100% !important; height: auto !important; }
  form, [class*="form"] { width: 100% !important; min-width: 0 !important; }
  input, select, textarea, button { max-width: 100% !important; font-size: 16px !important; }
  header, nav, footer, .navbar, .menu, [class*="nav"] {
    flex-direction: column !important;
    align-items: stretch !important;
    text-align: center !important;
    position: static !important;
  }
  .hero, [class*="hero"] { padding: 40px 16px !important; text-align: center !important; }
  [class*="button"], .btn, button { width: auto !important; min-width: 0 !important; }
}
`;

function ensureResponsiveCss(css) {
  if (!css) return css;
  if (/@media\s*\(/i.test(css)) return css;
  return css.replace(/\s*$/, "") + RESPONSIVE_CSS;
}

function ensureViewport(html) {
  if (!html) return html;
  if (/name=["']viewport["']/i.test(html)) return html;
  return html.replace(/<head([^>]*)>/i, '<head$1>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">');
}

const postProcessFile = (name, content) => {
  if (typeof content !== "string") return content;
  if (name.endsWith(".html")) return ensureViewport(ensureImages(content));
  if (name.endsWith(".css")) return ensureResponsiveCss(content);
  return content;
};

const safeInlineJs = (js) => (js || "").replace(/<\/script/gi, "<\\x3C/script");

function buildPreviewHtml(files, activeFile) {
  try {
    const html = (activeFile && activeFile.endsWith(".html") && files[activeFile]) || files["index.html"] || "";
    const css = files["styles.css"] || "";
    let js = safeInlineJs(files["script.js"] || "");

    if (!html && !css && !js) return "";

    // Se já tem HTML completo com tudo inline, retorna direto
    if (html && html.includes("<!DOCTYPE") && !css && !js && /<style/i.test(html)) return injectImgFallback(html);

    // Sempre monta um HTML completo e auto-contido
    const hasHead = /<head[\s>]/i.test(html);
    const hasBody = /<body[\s>]/i.test(html);

    let fullHtml = "";

    if (html && hasHead && hasBody) {
      // HTML estruturado — injeta CSS no head e JS no body
      // uso de função de substituição: conteúdo (js/css) pode conter "$`", "$&" etc.,
      // que o replace com string expandiria e corromperia o preview
      fullHtml = html;
      if (css) {
        if (fullHtml.includes("</head>")) {
          fullHtml = fullHtml.replace("</head>", () => `<style>\n${css}\n</style>\n</head>`);
        } else {
          fullHtml = fullHtml.replace("<head", () => `<head\n<style>\n${css}\n</style>`);
        }
      }
      if (js) {
        if (fullHtml.includes("</body>")) {
          fullHtml = fullHtml.replace("</body>", () => `<script>\n${js}\n</script>\n</body>`);
        } else {
          fullHtml += `\n<script>\n${js}\n</script>`;
        }
      }
    } else if (html) {
      // HTML sem estrutura completa — envolve tudo
      fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${css ? `<style>\n${css}\n</style>` : ""}
</head>
<body>
${html.replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*/i, "") || html}
${js ? `<script>\n${js}\n</script>` : ""}
</body>
</html>`;
    } else {
      // Sem HTML — monta do zero
      fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${css ? `<style>\n${css}\n</style>` : ""}
</head>
<body>
${js ? `<script>\n${js}\n</script>` : ""}
</body>
</html>`;
    }

    if (!/<style[\s>]/i.test(fullHtml) && !css) {
      if (fullHtml.includes("</head>")) {
        fullHtml = fullHtml.replace("</head>", () => `<style>\n${DEFAULT_CSS}\n</style>\n</head>`);
      } else {
        fullHtml = fullHtml.replace("<head", () => `<head\n<style>\n${DEFAULT_CSS}\n</style>`);
      }
    }

    return injectImgFallback(fullHtml);
  } catch {
    return "";
  }
}

class SiteBuilderErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 flex flex-col items-center justify-center h-full gap-4 text-center">
          <Code2 className="w-12 h-12 text-red-400" />
          <h2 className="text-lg font-semibold text-red-600">Erro no Construtor de Sites</h2>
          <p className="text-sm text-muted-foreground max-w-md">{String(this.state.error?.message || this.state.error)}</p>
          <Button variant="outline" onClick={() => { try { localStorage.removeItem(STORAGE_KEY); } catch {} window.location.reload(); }}>
            Limpar dados e recarregar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SiteBuilder() {
  const saved = loadState();
  const [messages, setMessages] = useState(saved.messages || []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState(saved.files || {});
  const [activeFile, setActiveFile] = useState(saved.activeFile || "");
  const [mobileTab, setMobileTab] = useState("chat");
  const [provider, setProvider] = useState("opencode");
  const [openCodeModel, setOpenCodeModel] = useState("big-pickle");
  const [ollamaModel, setOllamaModel] = useState("qwen2.5:3b-instruct");
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloning, setCloning] = useState(false);
  const [theme, setTheme] = useState("none");
  const [showCode, setShowCode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editText, setEditText] = useState("");
  const [edited, setEdited] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [publishUrl, setPublishUrl] = useState("");
  const [leftTab, setLeftTab] = useState("chat");
  const [saveWarning, setSaveWarning] = useState(false);
  const frameRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      const payload = JSON.stringify({ messages, files, activeFile });
      if (payload.length > 3500000) {
        setSaveWarning(true);
      } else {
        localStorage.setItem(STORAGE_KEY, payload);
        setSaveWarning(false);
      }
    } catch {
      setSaveWarning(true);
    }
  }, [messages, files, activeFile]);

  useEffect(() => {
    try { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); } catch {}
  }, [messages]);

  useEffect(() => {
    try {
      if (activeFile && files[activeFile] !== undefined) return;
      const keys = Object.keys(files);
      if (keys.length > 0) setActiveFile(keys[0]);
    } catch {}
  }, [files]);

  const fileList = Object.keys(files);
  const htmlPages = fileList.filter((f) => f.endsWith(".html"));
  const previewHtmlRaw = buildPreviewHtml(files, activeFile);

  const injectEditor = (html) => {
    if (!html) return html;
    const script = `<script>window.__keEdit=true;(function(){
  var s=document.createElement('style');
  s.textContent='.ke-edit-sel{outline:3px solid #2563eb !important;outline-offset:2px;border-radius:4px;cursor:pointer;} .ke-edit-sel:hover{outline-color:#7c3aed !important;}';
  document.head.appendChild(s);
  document.addEventListener('click', function(e){
    if(!window.__keEdit) return;
    e.preventDefault(); e.stopPropagation();
    var old=document.querySelector('.ke-edit-sel');
    if(old){ try{old.removeAttribute('contenteditable');}catch(_){}
      if(old.tagName==='A'){ try{old.removeAttribute('href');}catch(_){} }
      old.classList.remove('ke-edit-sel'); }
    var el=e.target;
    if(el===document.body||el===document.documentElement){ window.parent.postMessage({type:'ke-select',tag:'BODY',isImg:false,isBgImg:false},'*'); return; }
    el.classList.add('ke-edit-sel');
    el.setAttribute('contenteditable','true');
    try{ el.focus(); }catch(_){}
    var isIn=el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT';
    var cs=window.getComputedStyle(el);
    window.parent.postMessage({type:'ke-select',tag:el.tagName,isImg:el.tagName==='IMG',isInput:isIn,isBgImg:!!(cs&&/url\(/.test(cs.backgroundImage||'')),text:(isIn?(el.value||''):(el.textContent||''))},'*');
  }, true);
  document.addEventListener('input', function(){ if(window.__keEdit) window.parent.postMessage({type:'ke-change'},'*'); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ window.parent.postMessage({type:'ke-esc'},'*'); } });
  window.addEventListener('message', function(e){
    var d=e.data||{};
    if(!d.type||!window.__keEdit) return;
    if(d.type==='ke-add-img'){
      var img=document.createElement('img');
      img.src=d.src||''; img.alt=''; img.style.maxWidth='100%'; img.style.borderRadius='12px';
      var sel=document.querySelector('.ke-edit-sel');
      if(sel&&sel.tagName!=='BODY'&&sel.tagName!=='HTML'){ sel.parentNode.insertBefore(img, sel.nextSibling); }
      else { var t=document.body.firstChild; document.body.insertBefore(img, t); }
      window.parent.postMessage({type:'ke-change'},'*');
    }
    if(d.type==='ke-set-img'){
      var cur=document.querySelector('.ke-edit-sel');
      var el=(cur&&cur.tagName==='IMG')?cur:null;
      if(!el&&cur){ el={_bg:cur}; }
      if(!el){ var imgs=document.querySelectorAll('img'); if(imgs.length) el=imgs[Math.floor(Math.random()*imgs.length)]; }
      if(el){ if(el._bg){ el._bg.style.backgroundImage="url('"+(d.src||'')+"')"; } else { el.src=d.src||el.src; el.removeAttribute('srcset'); } window.parent.postMessage({type:'ke-change'},'*'); }
    }
  });
})();<\/script>`;
    return html.replace(/<\/body>/i, () => script + "\n</body>");
  };

  const previewHtml = editMode ? injectEditor(previewHtmlRaw) : previewHtmlRaw;

  useEffect(() => {
    const handler = (e) => {
      const d = e.data;
      if (!d || typeof d !== "object" || !d.type) return;
      if (d.type === "ke-select") {
        setSelected({ tag: d.tag, isImg: !!d.isImg, isInput: !!d.isInput, isBgImg: !!d.isBgImg, text: d.text || "" });
        setEditText(d.text || "");
      }
      if (d.type === "ke-change") setEdited(true);
      if (d.type === "ke-esc") setSelected(null);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const snapshotForUndo = () => {
    try {
      const doc = frameRef.current?.contentDocument;
      if (doc) setUndoStack((s) => [...s.slice(-19), "<!DOCTYPE html>\n" + doc.documentElement.outerHTML]);
    } catch {}
  };

  const withSelected = (fn) => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const el = doc?.querySelector(".ke-edit-sel");
    if (!el) { toast.error("Clique em um elemento do site primeiro"); return null; }
    fn(el, doc);
    setEdited(true);
    return el;
  };

  const toolText = (value) => {
    const v = String(value || "");
    if (!selected) { toast.error("Clique em um elemento do site primeiro"); return; }
    snapshotForUndo();
    withSelected((el) => {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.value = v;
      else el.textContent = v;
    });
  };

  const toolImage = (file) => {
    if (!file) return;
    snapshotForUndo();
    withSelected((el) => {
      const r = new FileReader();
      r.onload = () => {
        if (selected?.isBgImg && el.tagName !== "IMG") el.style.backgroundImage = `url("${r.result}")`;
        else el.src = r.result;
      };
      r.readAsDataURL(file);
    });
  };

  const postEditMsg = (type, extra) => {
    try {
      frameRef.current?.contentWindow?.postMessage({ type, ...extra }, "*");
    } catch {}
  };

  const toolAddImage = () => {
    snapshotForUndo();
    postEditMsg("ke-add-img", { src: modernImageUrl() });
    setEdited(true);
    toast.success("Imagem moderna adicionada — clique em Salvar alterações");
  };

  const toolRandomImage = () => {
    snapshotForUndo();
    postEditMsg("ke-set-img", { src: modernImageUrl() });
    setEdited(true);
    toast.success("Imagem moderna aplicada — clique em Salvar alterações");
  };

  const toolBgColor = (color) => snapshotForUndo() || withSelected((el) => { el.style.backgroundColor = color; });
  const toolTextColor = (color) => snapshotForUndo() || withSelected((el) => { el.style.color = color; });
  const toolFontDelta = (d) => snapshotForUndo() || withSelected((el) => {
    const cur = parseFloat(getComputedStyle(el).fontSize) || 16;
    el.style.fontSize = `${Math.max(8, cur + d)}px`;
  });
  const toolBold = () => snapshotForUndo() || withSelected((el) => {
    el.style.fontWeight = el.style.fontWeight === "bold" || el.style.fontWeight === "700" ? "normal" : "bold";
  });
  const toolItalic = () => snapshotForUndo() || withSelected((el) => {
    el.style.fontStyle = el.style.fontStyle === "italic" ? "normal" : "italic";
  });
  const toolAlign = (a) => snapshotForUndo() || withSelected((el) => { el.style.textAlign = a; });
  const toolPadDelta = (d) => snapshotForUndo() || withSelected((el) => {
    const cur = parseFloat(getComputedStyle(el).paddingTop) || 0;
    const next = Math.max(0, cur + d);
    el.style.padding = `${next}px`;
  });
  const toolHide = () => snapshotForUndo() || withSelected((el) => { el.style.display = "none"; });
  const toolRemove = () => snapshotForUndo() || withSelected((el) => { el.remove(); setSelected(null); });
  const toolClearStyle = () => snapshotForUndo() || withSelected((el) => { el.removeAttribute("style"); });

  const toolUndo = () => {
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setFiles((f) => ({ ...f, "index.html": prev }));
      setEdited(false);
      setSelected(null);
      return s.slice(0, -1);
    });
  };

  const saveEdits = () => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) throw new Error("documento indisponível");
      const html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
      setFiles((prev) => ({ ...prev, "index.html": html }));
      setEdited(false);
      toast.success("Alterações salvas no projeto");
    } catch (e) {
      toast.error("Erro ao salvar: " + (e?.message || e));
    }
  };

  const downloadPage = () => {
    if (!previewHtmlRaw) { toast.error("Nada para baixar"); return; }
    const blob = new Blob([previewHtmlRaw], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meu-site.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Página baixada (meu-site.html)");
  };

  const publishSite = async () => {
    if (!previewHtmlRaw) { toast.error("Nada para publicar"); return; }
    try {
      const name = (cloneUrl.split("/").filter(Boolean).pop() || "meu-site").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 30) || "meu-site";
      const { data, error } = await supabase.functions.invoke("publish-site", {
        body: { html: previewHtmlRaw, name },
      });
      if (error) throw new Error(error.message);
      setPublishUrl(data.url);
      toast.success("Site publicado!");
    } catch (e) {
      toast.error("Erro ao publicar: " + (e?.message || e));
    }
  };
  const applyTheme = (themeId) => {
    setTheme(themeId);
    const t = THEMES.find((x) => x.id === themeId);
    setFiles((prev) => {
      const merged = { ...prev };
      const base = stripThemeBlock(merged["styles.css"]);
      if (t && t.css) {
        merged["styles.css"] = (base ? base + "\n\n" : "") + `/* TEMA: ${t.label} */\n` + t.css;
      } else {
        merged["styles.css"] = base;
      }
      if (!merged["index.html"]) {
        merged["index.html"] = "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Meu Site</title>\n</head>\n<body>\n</body>\n</html>";
      }
      return merged;
    });
    toast.success(t && t.css ? `Tema ${t.label} aplicado` : "Tema removido");
  };

  const cloneViaRadar = async (target) => {
    toast.info("Buscando sites de referência do nicho...");
    const brief = await fetchDesignRef(String(target).replace(/^https?:\/\//, "").split("/")[0] + " website profissional moderno");
    const refBlock = brief ? brief + "\n\n" : "";
    const fullPrompt = refBlock + `PEDIDO DO CLIENTE: Gere um site profissional equivalente ao site ${target}, com seções, textos e estilo adequados ao segmento e público dele. ` + "Gere o site COMPLETO e personalizado em blocos. Formato obrigatório:\n\n### index.html\n```html\n...\n```\n\n### styles.css\n```css\n...\n```\n\n### script.js\n```js\n...\n```\n\nInclua sempre HTML completo com <!DOCTYPE html>, CSS completo com design bonito e responsivo, e JS funcional. Não omita nenhum arquivo. Não responda com texto corrido.";
    const { newFiles } = await generateFilesWithRetry([{ role: "user", content: fullPrompt }]);
    if (Object.keys(newFiles).length === 0 || !newFiles["index.html"]) {
      throw new Error("Não foi possível clonar nem gerar a partir do modelo do nicho");
    }
    const built = { ...files };
    for (const [k, v] of Object.entries(newFiles)) if (typeof v === "string") built[k] = postProcessFile(k, v);
    commitGenerated(built, "Site gerado do nicho");
    toast.success(`Clone via radar: gerado a partir do modelo do nicho de ${target}`);
  };

  const cloneSite = async () => {
    const url = cloneUrl.trim();
    if (!url) { toast.error("Cole a URL do site que deseja clonar"); return; }
    setCloning(true);
    try {
      let { data, error } = await supabase.functions.invoke("fetch-site", { body: { url, crawl: true } });
      if (error || !data?.scraped) {
        const retry = await supabase.functions.invoke("fetch-site", { body: { url, crawl: true } });
        data = retry.data;
        error = retry.error;
      }
      if (error) throw new Error(error.message);
      if (!data?.scraped || !data?.pages?.length) {
        await cloneViaRadar(data?.origin || url);
        return;
      }
      const origin = data.origin || new URL(data.url || url).origin;

      const pageName = (path) => {
        const p = String(path || "").replace(/^\/+|\/+$/g, "");
        if (!p || p === "index.html") return "index.html";
        const base = p.split("/").pop() || p;
        return (base.endsWith(".html") ? base : `${base}.html`).toLowerCase();
      };
      const rewriteLocalLinks = (html, pagePath) => {
        const self = pageName(pagePath);
        return html.replace(/(href|src)=["']([^"']+)["']/gi, (m, attr, val) => {
          if (!val.startsWith(origin)) return m;
          const path = val.slice(origin.length).split("#")[0].split("?")[0];
          if (!path || path === "/" || path === "/index.html") return `${attr}="index.html"`;
          const target = pageName(path);
          if (target === self) return m;
          return `${attr}="${target}"`;
        });
      };

      const mergeUnique = (existing, chunk) =>
        chunk && !(existing || "").includes(chunk) ? [existing, chunk].filter(Boolean).join("\n\n") : existing;

      const newFiles = { ...files };
      let globalCss = "";
      let globalJs = "";
      const pageNames = new Set();
      for (const page of data.pages) {
        let html = page.html || "";
        let css = page.css || "";
        let js = page.js || "";
        const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
        const extractedCss = styleMatches.map((m) => m[1].trim()).filter(Boolean).join("\n");
        for (const m of styleMatches) html = html.replace(m[0], "");
        const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)(?<!\\)<\/script>/gi)];
        const extractedJs = inlineScripts.map((m) => m[1].trim()).filter(Boolean).join("\n");
        for (const m of inlineScripts) html = html.replace(m[0], "");
        html = rewriteLocalLinks(html, page.path);
        html = html.replace(/<base\b[^>]*>/gi, () => `<base href="${origin}">`);
        const name = pageName(page.path);
        pageNames.add(name);
        newFiles[name] = html;
        globalCss = mergeUnique(globalCss, [extractedCss, css].filter(Boolean).join("\n\n"));
        globalJs = mergeUnique(globalJs, [extractedJs, js].filter(Boolean).join("\n\n"));
      }
      if (globalCss) newFiles["styles.css"] = mergeUnique(newFiles["styles.css"], globalCss);
      if (globalJs) newFiles["script.js"] = mergeUnique(newFiles["script.js"], globalJs);

      setFiles(newFiles);
      setActiveFile("index.html");
      const pagesMsg = [...pageNames].join(", ");
      setMessages((prev) => [...prev, { role: "assistant", content: `Site clonado com sucesso de ${data.url || url} (${pageNames.size} página(s)). Arquivos: ${pagesMsg}. Use a aba Ferramentas, o seletor de páginas acima do preview ou peça mudanças pelo chat.` }]);
      toast.success(`Clonado: ${pageNames.size} página(s) salvas`);
    } catch (e) {
      toast.error("Erro ao clonar: " + (e?.message || e));
    } finally {
      setCloning(false);
    }
  };

  const RETRY_HINT =
    "ATENÇÃO: sua resposta anterior não trouxe os arquivos completos (faltou o index.html com o HTML inteiro da página). Agora responda APENAS com o site completo no formato obrigatório: ### index.html (HTML completo com <!DOCTYPE html>) seguido do bloco de código, depois ### styles.css e ### script.js. Não escreva explicações nem texto corrido.";

  const generateFilesWithRetry = async (messages) => {
    let aiText = await callWithFallback(messages);
    let newFiles = parseFilesFromCode(aiText);
    let attempts = 1;
    while (attempts < 2 && (!newFiles["index.html"] || Object.keys(newFiles).length === 0)) {
      attempts++;
      aiText = await callWithFallback(messages.concat([{ role: "user", content: RETRY_HINT }]));
      newFiles = parseFilesFromCode(aiText);
    }
    return { aiText, newFiles };
  };

  const fidelityCheck = async (builtFiles, brief) => {
    if (!brief || Object.keys(builtFiles).length === 0) return null;
    const current = Object.entries(builtFiles).map(([k, v]) => `=== ${k} ===\n${v}`).join("\n\n");
    if (current.length > 26000) return null;
    const prompt = `REFERÊNCIA DE FIDELIDADE (modelo conceituado):\n${brief.slice(0, 2500)}\n\nSITE GERADO (compare item por item com a referência):\n${current}\n\nREVISÃO DE FIDELIDADE — compare e corrija TODAS as diferenças: 1) cores exatas da paleta da referência, 2) fontes, 3) ordem e estrutura das seções, 4) textos dos botões/CTAs, 5) cantos arredondados e espaçamentos, 6) temas das imagens, 7) responsividade mobile. REESCREVA os arquivos completos corrigidos no formato obrigatório:\n### index.html\n\`\`\`html\n...\n\`\`\`\n### styles.css\n\`\`\`css\n...\n\`\`\`\n### script.js\n\`\`\`js\n...\n\`\`\`\nSem texto corrido.`;
    try {
      const { newFiles } = await generateFilesWithRetry([{ role: "user", content: prompt }]);
      if (Object.keys(newFiles).length === 0 || !newFiles["index.html"]) return null;
      return newFiles;
    } catch {
      return null;
    }
  };

  const commitGenerated = (final, actionLabel) => {
    setFiles(final);
    const firstNew = Object.keys(final)[0] || "index.html";
    if (firstNew) setActiveFile(firstNew);
    setMessages((prev) => [...prev, { role: "assistant", content: friendlySummary(Object.keys(final), actionLabel) }]);
    toast.success(`${Object.keys(final).length} arquivo(s) ${actionLabel.toLowerCase()}`);
  };

  const improveDesign = async () => {
    if (sending) return;
    const current = fileList.map((f) => `=== ${f} ===\n${files[f]}`).join("\n\n");
    if (!current) { toast.error("Gere ou clone um site primeiro"); return; }
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: "Melhore o design deste site (mais bonito, moderno e expressivo)" }]);
    try {
      const fullPrompt = `Aqui está o site atual:\n\n${current.slice(0, 18000)}\n\nAgora REESCREVA o site inteiro deixando o design MUITO mais bonito e moderno (nível 2026): navbar com glassmorphism, hero com título em gradiente e CTA, cards arredondados com sombras e hover, paleta de cores harmoniosa, tipografia bold, espaçamentos generosos, animações sutis de fade-in, menu responsivo com hambúrguer no mobile e footer estilizado. Retorne os arquivos completos em blocos:\n### index.html\n\`\`\`html\n...\n\`\`\`\n### styles.css\n\`\`\`css\n...\n\`\`\`\n### script.js\n\`\`\`js\n...\n\`\`\``;
      const { newFiles } = await generateFilesWithRetry([{ role: "user", content: fullPrompt }]);
      if (Object.keys(newFiles).length === 0) throw new Error("Nenhum arquivo reconhecido");
      setFiles((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(newFiles)) if (typeof v === "string") merged[k] = postProcessFile(k, v);
        return merged;
      });
      setActiveFile(Object.keys(newFiles)[0]);
      setMessages((prev) => [...prev, { role: "assistant", content: friendlySummary(Object.keys(newFiles), "Design melhorado") }]);
      toast.success("Design melhorado!");
    } catch (e) {
      toast.error("Erro ao melhorar: " + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const isRateLimit = (msg) => /429|rate limit|limite|FreeUsageLimit|Créditos|credits|payment|quota|exceeded|too many|402/i.test(msg);

  const callWithFallback = async (messages) => {
    const tryAll = async (primary, primaryLabel, primaryFn) => {
      try {
        return await primaryFn();
      } catch (e) {
        const msg = String(e?.message || e);
        const fallbacks = [
          { label: "OpenCode", fn: () => callOpenCode(messages, openCodeModel) },
          { label: "llama.cpp", fn: () => callOllama(messages, ollamaModel) },
          { label: "Emergent", fn: () => callEmergent(messages) },
          { label: "Claude FCC", fn: () => callClaudeFCC(messages) },
        ].filter((f) => f.label !== primaryLabel);
        for (const fb of fallbacks) {
          try {
            toast.info(`${primaryLabel} indisponível — tentando ${fb.label}`);
            return await fb.fn();
          } catch {}
        }
        throw new Error(`${primaryLabel}: ${msg} (todos os providers falharam)`);
      }
    };

    if (provider === "opencode") return tryAll(provider, "OpenCode", () => callOpenCode(messages, openCodeModel));
    if (provider === "ollama") return tryAll(provider, "llama.cpp", () => callOllama(messages, ollamaModel));
    if (provider === "emergent") return tryAll(provider, "Emergent", () => callEmergent(messages));
    return tryAll(provider, "Claude FCC", () => callClaudeFCC(messages));
  };

  const fetchDesignRef = async (text) => {
    try {
      const { data, error } = await supabase.functions.invoke("site-referencia", { body: { prompt: String(text || "").slice(0, 300) } });
      if (error || !data?.brief) return "";
      return data.brief;
    } catch {
      return "";
    }
  };

  const isCreateIntent = (text) =>
    /cri(a|e|ar)?\s+(um\s+|o\s+|meu\s+)?(site|landing|p[aá]gina|blog|loja)|f[aá]?a\s+(um\s+|meu\s+)?(site|landing)|gerar?\s+(um\s+)?(site|landing)|site\s+de/i.test(text);

  const friendlySummary = (names, action) => {
    const list = names.map((n) => `• ${n}`).join("\n");
    return `✅ ${action} com sucesso:\n${list}\n\nVocê pode editar tudo no preview (toque em qualquer elemento), aplicar temas e trocar imagens na aba Ferramentas, ou pedir novas mudanças aqui no chat.`;
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      let finalUser = userMsg;
      let brief = "";
      if (isCreateIntent(userMsg)) {
        const [refResult] = await Promise.all([
          fetchDesignRef(userMsg),
          Promise.resolve(),
        ]);
        brief = refResult;
        if (brief) finalUser = brief + "\n\nPEDIDO DO CLIENTE:\n" + userMsg;
      }
      const aiText = await callWithFallback(history.concat([{ role: "user", content: finalUser }]));
      let newFiles = parseFilesFromCode(aiText);
      if (Object.keys(newFiles).length === 0 || !newFiles["index.html"]) {
        const retried = await generateFilesWithRetry(history.concat([{ role: "user", content: finalUser }]));
        newFiles = retried.newFiles;
      }
      if (Object.keys(newFiles).length === 0) {
        setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
        return;
      }
      const built = { ...files };
      for (const [k, v] of Object.entries(newFiles)) if (typeof v === "string") built[k] = postProcessFile(k, v);
      commitGenerated(built, "Site gerado");
    } catch (e) {
      const msg = e?.message || String(e);
      toast.error("Erro: " + msg);
      setMessages((prev) => [...prev, { role: "assistant", content: "Erro ao gerar código: " + msg }]);
    } finally {
      setSending(false);
    }
  };

  const generateAll = async () => {
    if (sending) return;
    const prompt = input.trim() || messages.filter((m) => m.role === "user").slice(-1)[0]?.content;
    const userPrompt = prompt || "Crie uma landing page moderna para um escritório de advocacia chamado Kênia Garcia Advocacia, com seções: início, serviços, equipe, contato e um formulário de contato funcional. Responsiva e bonita.";
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: userPrompt + "\n\n[Gerar Tudo]" }]);
    try {
      const brief = await fetchDesignRef(userPrompt);
      const refBlock = brief ? brief + "\n\n" : "";
      const fullPrompt = refBlock + "PEDIDO DO CLIENTE: " + userPrompt + "\n\nGere o site COMPLETO e personalizado em blocos. Formato obrigatório:\n\n### index.html\n```html\n...\n```\n\n### styles.css\n```css\n...\n```\n\n### script.js\n```js\n...\n```\n\nInclua sempre HTML completo com <!DOCTYPE html>, CSS completo com design bonito e responsivo, e JS funcional. Não omita nenhum arquivo. Não responda com texto corrido.";
      const { newFiles } = await generateFilesWithRetry([{ role: "user", content: fullPrompt }]);
      if (Object.keys(newFiles).length === 0) {
        throw new Error("Nenhum arquivo reconhecido na resposta");
      }
      const built = { ...files };
      for (const [k, v] of Object.entries(newFiles)) if (typeof v === "string") built[k] = postProcessFile(k, v);
      commitGenerated(built, "Tudo gerado");
    } catch (e) {
      const msg = e?.message || String(e);
      toast.error("Erro ao gerar tudo: " + msg);
      setMessages((prev) => [...prev, { role: "assistant", content: "Erro ao gerar tudo: " + msg }]);
    } finally {
      setSending(false);
    }
  };

  const downloadZip = useCallback(() => {
    if (fileList.length === 0) { toast.error("Nenhum arquivo para baixar."); return; }
    try {
      const content = fileList.map((path) => `=== ${path} ===\n${files[path]}`).join("\n\n");
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meu-site.txt";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado");
    } catch (e) {
      toast.error("Erro ao baixar: " + (e?.message || e));
    }
  }, [files, fileList]);

  const openInNewTab = useCallback(() => {
    if (!previewHtml) { toast.error("Nada para visualizar."); return; }
    try {
      const w = window.open("", "_blank");
      if (w) { w.document.write(previewHtml); w.document.close(); }
    } catch (e) {
      toast.error("Erro ao abrir: " + (e?.message || e));
    }
  }, [previewHtml]);

  const clearAll = () => {
    setMessages([]);
    setFiles({});
    setActiveFile("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast.success("Projeto limpo");
  };

  const deleteFile = (path) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    if (activeFile === path) {
      const remaining = Object.keys(files).filter((f) => f !== path);
      setActiveFile(remaining[0] || "");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <SiteBuilderErrorBoundary>
      <div className="p-4 h-[calc(100dvh-4rem)] flex flex-col gap-3">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { toolImage(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Code2 className="w-5 h-5" /> Criação
            </h1>
            <p className="text-xs text-muted-foreground">
              Descreva o site, clone um existente ou aplique um tema — a IA monta tudo para você.
            </p>
          </div>
          <div className="flex gap-2">
            {fileList.length > 0 && (
              <>
                <Button size="sm" variant={editMode ? "default" : "outline"} onClick={() => setEditMode((v) => !v)}>
                  <MousePointer2 className="w-3 h-3 mr-1" /> {editMode ? "Concluir Edição" : "Editar Site"}
                </Button>
                <Button size="sm" variant="outline" onClick={openInNewTab}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                </Button>
                <Button size="sm" variant="outline" onClick={downloadPage}>
                  <Download className="w-3 h-3 mr-1" /> Baixar Página
                </Button>
                <Button size="sm" onClick={publishSite}>
                  <Globe className="w-3 h-3 mr-1" /> Publicar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCode((v) => !v)}>
                  <FileCode className="w-3 h-3 mr-1" /> {showCode ? "Ver Site" : "Ver Código"}
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={clearAll}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-card border rounded-lg px-3 py-2 overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs font-medium text-muted-foreground">Clonar:</span>
            <Input
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") cloneSite(); }}
              placeholder="https://site-para-clonar.com"
              className="h-8 w-36 sm:w-52 text-xs"
            />
            <Button size="sm" variant="outline" className="h-8" onClick={cloneSite} disabled={cloning}>
              {cloning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />} Clonar
            </Button>
          </div>
          <span className="text-muted-foreground shrink-0">|</span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs font-medium text-muted-foreground">Gerador:</span>
            {PROVIDERS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={provider === p.id ? "default" : "outline"}
                onClick={() => setProvider(p.id)}
                title={p.desc}
                className="h-8"
              >
                <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
                {p.label}
              </Button>
            ))}
          </div>
          {provider === "opencode" && (
            <>
              <span className="text-muted-foreground shrink-0">|</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Modelo:</span>
                {OPENCODE_MODELS.map((m) => (
                  <Button
                    key={m.id}
                    size="sm"
                    variant={openCodeModel === m.id ? "default" : "outline"}
                    onClick={() => setOpenCodeModel(m.id)}
                    title={m.desc}
                    className="h-8"
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </>
          )}
          {provider === "ollama" && (
            <>
              <span className="text-muted-foreground shrink-0">|</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Modelo:</span>
                {OLLAMA_MODELS.map((m) => (
                  <Button
                    key={m.id}
                    size="sm"
                    variant={ollamaModel === m.id ? "default" : "outline"}
                    onClick={() => setOllamaModel(m.id)}
                    title={m.desc}
                    className="h-8"
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </>
          )}
          <span className="text-muted-foreground shrink-0">|</span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs font-medium text-muted-foreground">Tema:</span>
            {THEMES.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={theme === t.id ? "default" : "outline"}
                onClick={() => applyTheme(t.id)}
                className="h-8"
              >
                {t.label}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex gap-2 shrink-0">
            {fileList.length > 0 && (
              <Button size="sm" variant="outline" onClick={improveDesign} disabled={sending}>
                <Sparkles className="w-3 h-3 mr-1" /> Melhorar Design
              </Button>
            )}
            <Button size="sm" onClick={generateAll} disabled={sending}>
              <Loader2 className={`w-3 h-3 mr-1 ${sending ? "animate-spin" : ""}`} /> Gerar Tudo
            </Button>
          </div>
        </div>

        {saveWarning && (
          <div className="flex items-center gap-2 shrink-0 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="text-amber-700">Projeto muito grande para salvar automaticamente — use Baixar Página ou Publicar para não perder o trabalho.</span>
          </div>
        )}

        {publishUrl && (
          <div className="flex items-center gap-2 shrink-0 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs">
            <Globe className="w-3 h-3 text-green-600" />
            <span className="text-green-700">Seu site publicado:</span>
            <a href={publishUrl} target="_blank" rel="noreferrer" className="text-green-700 underline font-medium break-all">{publishUrl}</a>
          </div>
        )}

        <div className="flex-1 min-h-0 hidden lg:grid lg:grid-cols-[minmax(300px,380px)_1fr] gap-3">
          <Card className="flex flex-col min-h-0">
            <Tabs value={leftTab} onValueChange={setLeftTab} className="flex flex-col h-full">
              <TabsList className="shrink-0 mx-3 mt-2">
                <TabsTrigger value="chat"><MessageSquare className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
                {editMode && <TabsTrigger value="tools"><Wrench className="w-3 h-3 mr-1" /> Ferramentas</TabsTrigger>}
              </TabsList>
              <TabsContent value="chat" className="flex-1 min-h-0 mt-2">
                <ChatPanel messages={messages} input={input} setInput={setInput} sending={sending} send={send} handleKeyDown={handleKeyDown} chatEndRef={chatEndRef} fullHeight />
              </TabsContent>
              <TabsContent value="tools" className="flex-1 min-h-0 mt-2">
                <EditToolsPanel
                  selected={selected}
                  editText={editText}
                  setEditText={setEditText}
                  edited={edited}
                  undoCount={undoStack.length}
                  onTextApply={toolText}
                  onPickImage={() => fileInputRef.current?.click()}
                  onBgColor={toolBgColor}
                  onTextColor={toolTextColor}
                  onFontDelta={toolFontDelta}
                  onBold={toolBold}
                  onItalic={toolItalic}
                  onAlign={toolAlign}
                  onPadDelta={toolPadDelta}
                  onHide={toolHide}
                  onRemove={toolRemove}
                  onClearStyle={toolClearStyle}
                  onUndo={toolUndo}
                  onSave={saveEdits}
                />
              </TabsContent>
            </Tabs>
          </Card>
          <div className="flex flex-col gap-2 min-h-0">
            {htmlPages.length > 1 && (
              <div className="flex items-center gap-1 shrink-0 bg-card border rounded-lg px-2 py-1 overflow-x-auto">
                <Globe className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                <span className="text-[10px] font-medium text-muted-foreground shrink-0">Páginas:</span>
                {htmlPages.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={activeFile === p ? "default" : "outline"}
                    className="h-6 px-2 text-[11px] shrink-0"
                    onClick={() => setActiveFile(p)}
                    title={p}
                  >
                    {p === "index.html" ? "Início" : p.replace(".html", "")}
                  </Button>
                ))}
              </div>
            )}
            {showCode && fileList.length > 0 ? (
              <EditorPanel files={files} activeFile={activeFile} setActiveFile={setActiveFile} deleteFile={deleteFile} />
            ) : (
              <PreviewPanel html={previewHtml} onOpen={openInNewTab} onFrameRef={(r) => { frameRef.current = r; }} editMode={editMode} />
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 lg:hidden">
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="h-full flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="chat"><MessageSquare className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="w-3 h-3 mr-1" /> Site</TabsTrigger>
              {editMode && <TabsTrigger value="tools"><Wrench className="w-3 h-3 mr-1" /> Ferramentas</TabsTrigger>}
              {fileList.length > 0 && (
                <TabsTrigger value="editor"><FileCode className="w-3 h-3 mr-1" /> Código</TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="chat" className="flex-1 min-h-0 mt-2">
              <ChatPanel messages={messages} input={input} setInput={setInput} sending={sending} send={send} handleKeyDown={handleKeyDown} chatEndRef={chatEndRef} fullHeight />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 min-h-0 mt-2">
              <PreviewPanel html={previewHtml} onOpen={openInNewTab} onFrameRef={(r) => { frameRef.current = r; }} fullHeight editMode={editMode} />
            </TabsContent>
            <TabsContent value="tools" className="flex-1 min-h-0 mt-2">
              <EditToolsPanel
                selected={selected}
                editText={editText}
                setEditText={setEditText}
                edited={edited}
                undoCount={undoStack.length}
                onTextApply={toolText}
                onPickImage={() => fileInputRef.current?.click()}
                onBgColor={toolBgColor}
                onTextColor={toolTextColor}
                onFontDelta={toolFontDelta}
                onBold={toolBold}
                onItalic={toolItalic}
                onAlign={toolAlign}
                onPadDelta={toolPadDelta}
                onHide={toolHide}
                onRemove={toolRemove}
                onClearStyle={toolClearStyle}
                onUndo={toolUndo}
                onSave={saveEdits}
              />
            </TabsContent>
            <TabsContent value="editor" className="flex-1 min-h-0 mt-2">
              <EditorPanel files={files} activeFile={activeFile} setActiveFile={setActiveFile} deleteFile={deleteFile} fullHeight />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SiteBuilderErrorBoundary>
  );
}

function summarizeCode(text) {
  return String(text).replace(/```[a-zA-Z0-9_-]*\n[\s\S]*?```/g, (match) => {
    const lang = (match.match(/```([a-zA-Z0-9_-]*)/) || [])[1] || "arquivo";
    const lines = match.split("\n").length - 2;
    const label = lang === "html" ? "index.html" : lang === "css" ? "styles.css" : lang === "js" || lang === "javascript" ? "script.js" : `${lang}.${lang}`;
    return `\n[arquivo gerado: ${label} — ${lines} linhas]\n`;
  });
}

function ChatPanel({ messages, input, setInput, sending, send, handleKeyDown, chatEndRef, fullHeight }) {
  return (
    <Card className={`flex flex-col ${fullHeight ? "h-full" : ""}`}>
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gold-600" />
        <span className="text-xs font-medium">Chat com IA</span>
      </div>
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Code2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Descreva o site que deseja criar.</p>
            <p className="text-xs mt-1">Ex: "Crie uma landing page para escritorio de advocacia"</p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
              <div className={`inline-block max-w-[90%] rounded-lg px-3 py-2 ${
                m.role === "user" ? "bg-gold-100 text-gold-900" : "bg-muted text-foreground"
              }`}>
                <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{summarizeCode(m.content)}</div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Gerando codigo...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Descreva o site..." disabled={sending} />
          <Button size="sm" onClick={send} disabled={sending || !input.trim()}>
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EditorPanel({ files, activeFile, setActiveFile, deleteFile, fullHeight }) {
  const fileList = Object.keys(files);
  const content = files[activeFile] || "";

  return (
    <Card className={`flex flex-col ${fullHeight ? "h-full" : ""}`}>
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-gold-600" />
        <span className="text-xs font-medium">Arquivos</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">{fileList.length}</Badge>
      </div>
      {fileList.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
          Nenhum arquivo gerado ainda.
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex gap-1 px-2 py-1.5 border-b overflow-x-auto shrink-0">
            {fileList.map((path) => (
              <button
                key={path}
                onClick={() => setActiveFile(path)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] whitespace-nowrap transition-colors ${
                  activeFile === path
                    ? "bg-gold-100 text-gold-700 font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <FileCode className="w-3 h-3" />
                {path}
                <span
                  onClick={(e) => { e.stopPropagation(); deleteFile(path); }}
                  className="ml-1 text-muted-foreground hover:text-red-500 cursor-pointer"
                >
                  x
                </span>
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <pre className="p-3 text-[11px] leading-relaxed font-mono text-foreground whitespace-pre-wrap break-words">
              {content}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
}

function EditToolsPanel({ selected, editText, setEditText, edited, undoCount, onTextApply, onPickImage, onBgColor, onTextColor, onFontDelta, onBold, onItalic, onAlign, onPadDelta, onHide, onRemove, onClearStyle, onUndo, onSave, onAddImage, onRandomImage }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b flex items-center gap-2 shrink-0">
        <Wrench className="w-4 h-4 text-gold-600" />
        <span className="text-xs font-medium">Ferramentas</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {selected ? selected.tag.toLowerCase() : "nada selecionado"}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {!selected && (
            <div className="text-xs text-muted-foreground text-center py-6">
              <MousePointer2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Clique em um elemento do site para editá-lo.</p>
              <p className="text-[10px] mt-1">Textos, imagens, cores, fontes e mais.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground">Texto</Label>
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onTextApply(editText); }}
              placeholder="Novo texto do elemento..."
              className="h-8 text-xs"
              disabled={!selected}
            />
            <Button size="sm" className="h-7 w-full" disabled={!selected} onClick={() => onTextApply(editText)}>
              Aplicar texto
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground">Imagem</Label>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" className="h-7 flex-1 min-w-[120px]" onClick={onAddImage}>
                <ImagePlus className="w-3 h-3 mr-1" /> Adicionar imagem moderna
              </Button>
              <Button size="sm" variant="outline" className="h-7 flex-1 min-w-[120px]" onClick={onRandomImage}>
                <RefreshCw className="w-3 h-3 mr-1" /> Imagem aleatória
              </Button>
              <Button size="sm" variant="outline" className="h-7 flex-1 min-w-[120px]" onClick={onPickImage} disabled={!selected}>
                Trocar (arquivo)
              </Button>
            </div>
            {!selected?.isImg && !selected?.isBgImg && <p className="text-[10px] text-muted-foreground">Selecione uma imagem ou um elemento com imagem de fundo para trocá-la por arquivo.</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground">Cores</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                <input type="color" className="w-6 h-6 rounded cursor-pointer" disabled={!selected} onChange={(e) => onBgColor(e.target.value)} />
                Fundo
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                <input type="color" className="w-6 h-6 rounded cursor-pointer" disabled={!selected} onChange={(e) => onTextColor(e.target.value)} />
                Texto
              </label>
              <Button size="sm" variant="ghost" className="h-6 text-[10px" disabled={!selected} onClick={onClearStyle}>
                <Eraser className="w-3 h-3 mr-1" /> Limpar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground">Tipografia</Label>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={() => onFontDelta(-2)}>A−</Button>
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={() => onFontDelta(2)}>A+</Button>
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={onBold} title="Negrito"><Bold className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={onItalic} title="Itálico"><Italic className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={() => onAlign("left")} title="Esquerda"><AlignLeft className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={() => onAlign("center")} title="Centro"><AlignCenter className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={() => onAlign("right")} title="Direita"><AlignRight className="w-3 h-3" /></Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground">Layout</Label>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={() => onPadDelta(-4)}>Pad −</Button>
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={() => onPadDelta(4)}>Pad +</Button>
              <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selected} onClick={onHide}>Ocultar</Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-rose-600" disabled={!selected} onClick={onRemove}>Remover</Button>
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <Button size="sm" variant="outline" className="h-7 w-full" disabled={undoCount === 0} onClick={onUndo}>
              <Undo2 className="w-3 h-3 mr-1" /> Desfazer
            </Button>
            <Button size="sm" className="h-7 w-full" disabled={!edited} onClick={onSave}>
              <Save className="w-3 h-3 mr-1" /> Salvar alterações
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function PreviewPanel({ html, onOpen, onFrameRef, fullHeight, editMode }) {
  const frameRef = useRef(null);
  const wrapRef = useRef(null);
  const [dims, setDims] = useState(null);
  const [zoomMode, setZoomMode] = useState("page");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (editMode) { setZoomMode("full"); setZoom(1); }
  }, [editMode]);

  useEffect(() => {
    if (frameRef.current && html) {
      try {
        frameRef.current.srcdoc = html;
      } catch {}
    }
  }, [html]);

  useEffect(() => {
    if (onFrameRef) onFrameRef(frameRef.current);
  }, [onFrameRef]);

  const handleLoad = () => {
    try {
      const doc = frameRef.current?.contentDocument;
      if (!doc) return;
      setDims({
        w: Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth || 0, 320),
        h: Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0, 200),
      });
    } catch {}
  };

  const wrapW = wrapRef.current?.clientWidth || 0;
  const wrapH = wrapRef.current?.clientHeight || 0;
  const scale =
    zoomMode === "fit" && dims && wrapW > 0 ? Math.min(1, wrapW / dims.w)
    : zoomMode === "page" && dims && wrapW > 0 && wrapH > 0 ? Math.min(1, wrapW / dims.w, wrapH / dims.h)
    : zoom;
  const scaledW = dims ? Math.max(dims.w * scale, wrapW || 0) : wrapW || "100%";
  const scaledH = dims ? dims.h * scale : 0;

  return (
    <Card className={`flex flex-col ${fullHeight ? "h-full" : ""}`}>
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Eye className="w-4 h-4 text-gold-600" />
        <span className="text-xs font-medium">Preview</span>
        {editMode && <Badge variant="secondary" className="ml-1 text-[10px]">toque em um elemento para editar</Badge>}
        {dims && (
          <div className="flex items-center gap-1 ml-auto">
            <Button size="sm" variant={zoomMode === "page" ? "default" : "outline"} className="h-6 px-2" onClick={() => setZoomMode("page")}>
              Completa
            </Button>
            <Button size="sm" variant={zoomMode === "fit" ? "default" : "outline"} className="h-6 px-2" onClick={() => setZoomMode("fit")}>
              Página inteira
            </Button>
            <Button size="sm" variant={zoomMode === "full" && zoom === 0.5 ? "default" : "outline"} className="h-6 px-2" onClick={() => { setZoomMode("full"); setZoom(0.5); }}>
              50%
            </Button>
            <Button size="sm" variant={zoomMode === "full" && zoom === 1 ? "default" : "outline"} className="h-6 px-2" onClick={() => { setZoomMode("full"); setZoom(1); }}>
              100%
            </Button>
          </div>
        )}
        {html && (
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onOpen}>
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0 bg-white">
        {html ? (
          <div ref={wrapRef} className="w-full h-full overflow-auto">
            <div style={{ width: scaledW, height: scaledH, overflow: "hidden", margin: "0 auto" }}>
              <iframe
                ref={frameRef}
                onLoad={handleLoad}
                srcDoc={html}
                style={{
                  width: dims?.w || "100%",
                  height: dims?.h || "100%",
                  border: 0,
                  display: "block",
                  transform: scale < 1 ? `scale(${scale})` : "none",
                  transformOrigin: "top left",
                }}
                sandbox="allow-scripts allow-same-origin"
                title="Preview"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            <div className="text-center">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>O preview aparecera aqui.</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
