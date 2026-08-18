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
  AlignLeft, AlignCenter, AlignRight, Undo2, Eraser
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "site-builder:state";

const FCC_MODEL = import.meta.env.VITE_FCC_MODEL || "claude-3-freecc-no-thinking/opencode/nemotron-3-ultra-free";

const SITE_SYSTEM_PROMPT = `Você é um construtor profissional de sites e aplicativos web.
Sempre que receber um pedido, responda APENAS com o código completo e funcional do site, organizado em blocos com o nome do arquivo em um título (###) logo acima do bloco:

### index.html
\`\`\`html
<!DOCTYPE html>
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

REGRAS OBRIGATÓRIAS:
- Todo site DEVE ter personalização visual: CSS completo (cores harmoniosas, tipografia agradável, layout moderno e responsivo, espaçamentos, bordas arredondadas, efeitos de hover).
- Para aplicativos, use app.js com funções que interagem com a página.
- Textos sempre em português do Brasil.
- Nunca responda com texto corrido descrevendo o site: SEMPRE entregue o código completo em blocos.
- Explicação: no máximo 1 linha curta antes dos blocos.`;

const PROVIDERS = [
  { id: "fcc", label: "Claude FCC", desc: "Grátis via free-claude-code", color: "#d97706" },
  { id: "opencode", label: "OpenCode", desc: "Zen (gratuito)", color: "#2563eb" },
];

async function callClaudeFCC(messages) {
  const { data, error } = await supabase.functions.invoke("fcc-proxy", {
    body: {
      provider: "fcc",
      model: FCC_MODEL,
      max_tokens: 8000,
      system: SITE_SYSTEM_PROMPT,
      messages: messages.filter((m) => m.role !== "system"),
    },
  });
  if (error) {
    throw new Error(`Claude FCC: ${error.message}`);
  }
  const blocks = (data?.content || []).filter((b) => b.type === "text");
  const text = blocks.map((b) => b.text || "").join("\n").trim();
  if (!text) throw new Error("Claude FCC retornou resposta vazia");
  return text;
}

async function callOpenCode(messages) {
  const { data, error } = await supabase.functions.invoke("fcc-proxy", {
    body: {
      provider: "opencode",
      max_tokens: 8000,
      messages: [{ role: "system", content: SITE_SYSTEM_PROMPT }, ...messages.filter((m) => m.role !== "system")],
    },
  });
  if (error) {
    throw new Error(`OpenCode: ${error.message}`);
  }
  const text = (data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("OpenCode retornou resposta vazia");
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
body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #1e3a5f 0%, #0f2b46 100%); min-height: 100vh; color: #eef4fb; line-height: 1.7; }
main { max-width: 820px; margin: 0 auto; padding: 64px 24px; }
h1 { font-size: 2.2rem; color: #ffd98a; margin-bottom: 24px; border-bottom: 2px solid #ffd98a55; padding-bottom: 16px; }
p { margin-bottom: 16px; font-size: 1.05rem; }
</style>
</head>
<body>
<main>
<h1>${title}</h1>
${paragraphs}
</main>
</body>
</html>`;
}

const DEFAULT_CSS = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f4f6fa; color: #1f2937; line-height: 1.6; }
h1, h2, h3 { color: #1e3a5f; line-height: 1.3; }
button { cursor: pointer; border: none; border-radius: 8px; padding: 10px 18px; font-size: 1rem; transition: all .2s; }
a { color: #2563eb; text-decoration: none; }
img { max-width: 100%; height: auto; }
.container { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08); padding: 24px; }
@media (max-width: 768px) { h1 { font-size: 1.7rem; } }`;

const THEMES = [
  { id: "none", label: "Sem tema" },
  { id: "moderno", label: "Moderno", css: `:root { --accent: #2563eb; --accent2: #7c3aed; }
body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: #f8fafc; }
h1, h2, h3 { font-weight: 800; letter-spacing: -0.02em; }
h1 { font-size: 2.6rem; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
button, .btn, [class*="button"] { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff !important; border-radius: 12px; box-shadow: 0 8px 24px rgba(37,99,235,.3); }
button:hover, .btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(37,99,235,.4); }
.card, [class*="card"] { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
nav, header { background: rgba(255,255,255,.85); backdrop-filter: blur(12px); }
a { color: var(--accent); }` },
  { id: "elegante", label: "Elegante", css: `:root { --accent: #8a5a2b; --accent2: #d4af7a; }
body { font-family: Georgia, 'Times New Roman', serif; background: #faf6ef; color: #3b2f22; }
h1, h2, h3 { font-family: Georgia, serif; font-weight: 400; letter-spacing: .02em; color: #5c3d1e; }
h1 { font-size: 2.4rem; border-bottom: 1px solid #d4af7a; padding-bottom: .4em; }
button, .btn { background: #5c3d1e; color: #f5e9d5 !important; border-radius: 2px; letter-spacing: .08em; text-transform: uppercase; font-size: .85rem; }
.card, [class*="card"] { background: #fffdf8; border: 1px solid #e4d5bb; border-radius: 4px; box-shadow: 0 2px 12px rgba(92,61,30,.08); }
a { color: #8a5a2b; text-decoration: underline; }` },
  { id: "vibrante", label: "Vibrante", css: `:root { --accent: #f43f5e; --accent2: #f59e0b; }
body { font-family: 'Poppins', 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #fef9e7; }
h1, h2, h3 { font-weight: 800; color: #fbbf24; text-shadow: 0 2px 20px rgba(244,63,94,.5); }
h1 { font-size: 2.6rem; }
button, .btn { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff !important; font-weight: 700; border-radius: 999px; box-shadow: 0 10px 30px rgba(244,63,94,.45); }
button:hover, .btn:hover { filter: brightness(1.1); transform: scale(1.03); }
.card, [class*="card"] { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); border-radius: 20px; backdrop-filter: blur(8px); }
a { color: #fbbf24; }` },
  { id: "luxo", label: "Luxo", css: `:root { --accent: #b08d3e; --accent2: #f3e5b8; }
body { font-family: 'Playfair Display', Georgia, serif; background: #0d0d0d; color: #e8e0ce; }
h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; color: #d4af37; letter-spacing: .05em; }
h1 { font-size: 2.6rem; text-shadow: 0 0 40px rgba(212,175,55,.35); }
button, .btn { background: linear-gradient(135deg, #b08d3e, #d4af37); color: #0d0d0d !important; border-radius: 0; letter-spacing: .1em; text-transform: uppercase; font-family: 'Segoe UI', sans-serif; font-weight: 600; }
.card, [class*="card"] { background: linear-gradient(160deg, #161616, #1f1f1f); border: 1px solid #b08d3e55; border-radius: 8px; box-shadow: 0 8px 40px rgba(212,175,55,.12); }
a { color: #d4af37; }` },
  { id: "minimalista", label: "Minimalista", css: `:root { --accent: #111827; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #ffffff; color: #111827; }
h1, h2, h3 { font-weight: 300; letter-spacing: .06em; color: #111827; }
h1 { font-size: 2.6rem; text-transform: uppercase; }
button, .btn { background: #111827; color: #fff !important; border-radius: 0; font-weight: 400; letter-spacing: .1em; text-transform: uppercase; }
.card, [class*="card"] { background: #fff; border: 1px solid #e5e5e5; border-radius: 0; box-shadow: none; }
a { color: #111827; border-bottom: 1px solid #111827; }` },
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

function buildPreviewHtml(files) {
  try {
    const html = files["index.html"] || "";
    const css = files["styles.css"] || "";
    const js = files["script.js"] || "";

    if (!html && !css && !js) return "";

    // Se já tem HTML completo com tudo inline, retorna direto
    if (html && html.includes("<!DOCTYPE") && !css && !js && /<style/i.test(html)) return html;

    // Sempre monta um HTML completo e auto-contido
    const hasHead = /<head[\s>]/i.test(html);
    const hasBody = /<body[\s>]/i.test(html);

    let fullHtml = "";

    if (html && hasHead && hasBody) {
      // HTML estruturado — injeta CSS no head e JS no body
      fullHtml = html;
      if (css) {
        if (fullHtml.includes("</head>")) {
          fullHtml = fullHtml.replace("</head>", `<style>\n${css}\n</style>\n</head>`);
        } else {
          fullHtml = fullHtml.replace("<head", `<head\n<style>\n${css}\n</style>`);
        }
      }
      if (js) {
        if (fullHtml.includes("</body>")) {
          fullHtml = fullHtml.replace("</body>", `<script>\n${js}\n</script>\n</body>`);
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
        fullHtml = fullHtml.replace("</head>", `<style>\n${DEFAULT_CSS}\n</style>\n</head>`);
      } else {
        fullHtml = fullHtml.replace("<head", `<head\n<style>\n${DEFAULT_CSS}\n</style>`);
      }
    }

    return fullHtml;
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
  const [provider, setProvider] = useState("fcc");
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
  const frameRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, files, activeFile })); } catch {}
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

  const previewHtmlRaw = buildPreviewHtml(files);

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
    if(el===document.body||el===document.documentElement){ window.parent.postMessage({type:'ke-select',tag:'BODY',isImg:false},'*'); return; }
    el.classList.add('ke-edit-sel');
    el.setAttribute('contenteditable','true');
    try{ el.focus(); }catch(_){}
    var isIn=el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT';
    window.parent.postMessage({type:'ke-select',tag:el.tagName,isImg:el.tagName==='IMG',isInput:isIn,text:(isIn?(el.value||''):(el.textContent||''))},'*');
  }, true);
  document.addEventListener('input', function(){ if(window.__keEdit) window.parent.postMessage({type:'ke-change'},'*'); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ window.parent.postMessage({type:'ke-esc'},'*'); } });
})();<\/script>`;
    return html.replace(/<\/body>/i, script + "\n</body>");
  };

  const previewHtml = editMode ? injectEditor(previewHtmlRaw) : previewHtmlRaw;

  useEffect(() => {
    const handler = (e) => {
      const d = e.data;
      if (!d || typeof d !== "object" || !d.type) return;
      if (d.type === "ke-select") {
        setSelected({ tag: d.tag, isImg: !!d.isImg, isInput: !!d.isInput, text: d.text || "" });
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
      r.onload = () => { el.src = r.result; };
      r.readAsDataURL(file);
    });
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
  const fileList = Object.keys(files);

  const applyTheme = (themeId) => {
    setTheme(themeId);
    const t = THEMES.find((x) => x.id === themeId);
    if (!t || !t.css) return;
    setFiles((prev) => {
      const base = prev["styles.css"] || "";
      const clean = base
        .split("\n")
        .filter((l) => !/^\s*\/\* TEMA:/.test(l))
        .join("\n")
        .trim();
      const merged = { ...prev };
      merged["styles.css"] = (clean ? clean + "\n\n" : "") + `/* TEMA: ${t.label} */\n` + t.css;
      return merged;
    });
    if (!files["index.html"]) {
      setFiles((prev) => ({
        ...prev,
        "index.html": "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Meu Site</title>\n</head>\n<body>\n</body>\n</html>",
      }));
    }
    toast.success(`Tema ${t.label} aplicado`);
  };

  const cloneSite = async () => {
    const url = cloneUrl.trim();
    if (!url) { toast.error("Cole a URL do site que deseja clonar"); return; }
    setCloning(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-site", { body: { url } });
      if (error) throw new Error(error.message);
      if (!data?.html) throw new Error("Nenhum HTML retornado");
      let html = data.html;
      let css = data.css || "";
      let js = data.js || "";
      const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
      const extractedCss = styleMatches.map((m) => m[1].trim()).filter(Boolean).join("\n");
      for (const m of styleMatches) html = html.replace(m[0], "");
      const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
      const extractedJs = inlineScripts.map((m) => m[1].trim()).filter(Boolean).join("\n");
      for (const m of inlineScripts) html = html.replace(m[0], "");
      const newFiles = { ...files };
      newFiles["index.html"] = html;
      if (extractedCss || css) newFiles["styles.css"] = [extractedCss, css].filter(Boolean).join("\n\n");
      if (extractedJs || js) newFiles["script.js"] = [extractedJs, js].filter(Boolean).join("\n\n");
      setFiles(newFiles);
      setActiveFile("index.html");
      setMessages((prev) => [...prev, { role: "assistant", content: `Site clonado com sucesso de ${data.url || url}. Arquivos: ${Object.keys(newFiles).join(", ")}. Use a aba Ferramentas ou peça mudanças pelo chat.` }]);
      toast.success(`Site clonado: ${Object.keys(newFiles).join(", ")}`);
    } catch (e) {
      toast.error("Erro ao clonar: " + (e?.message || e));
    } finally {
      setCloning(false);
    }
  };

  const improveDesign = async () => {
    if (sending) return;
    const current = fileList.map((f) => `=== ${f} ===\n${files[f]}`).join("\n\n");
    if (!current) { toast.error("Gere ou clone um site primeiro"); return; }
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: "Melhore o design deste site (mais bonito, moderno e expressivo)" }]);
    try {
      const fullPrompt = `Aqui está o site atual:\n\n${current.slice(0, 18000)}\n\nAgora REESCREVA o site inteiro deixando o design MUITO mais bonito, moderno e expressivo (melhores cores, tipografia, espaçamentos, efeitos de hover, animações sutis, responsividade perfeita). Retorne os arquivos completos em blocos:\n### index.html\n\`\`\`html\n...\n\`\`\`\n### styles.css\n\`\`\`css\n...\n\`\`\`\n### script.js\n\`\`\`js\n...\n\`\`\``;
      const aiText = await callWithFallback([{ role: "user", content: fullPrompt }]);
      const newFiles = parseFilesFromCode(aiText);
      if (Object.keys(newFiles).length === 0) throw new Error("Nenhum arquivo reconhecido");
      setFiles((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(newFiles)) if (typeof v === "string") merged[k] = v;
        return merged;
      });
      setActiveFile(Object.keys(newFiles)[0]);
      setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
      toast.success("Design melhorado!");
    } catch (e) {
      toast.error("Erro ao melhorar: " + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const isRateLimit = (msg) => /429|rate limit|limite|FreeUsageLimit|Créditos|credits|payment/i.test(msg);

  const callWithFallback = async (messages) => {
    if (provider === "opencode") {
      try {
        return await callOpenCode(messages);
      } catch (e) {
        if (isRateLimit(String(e?.message || e))) {
          toast.info("OpenCode com limite de uso — usando Claude FCC como alternativa");
          return await callClaudeFCC(messages);
        }
        throw e;
      }
    }
    return await callClaudeFCC(messages);
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const aiText = await callWithFallback(history.concat([{ role: "user", content: userMsg }]));

      const newFiles = parseFilesFromCode(aiText);

      setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);

      if (Object.keys(newFiles).length > 0) {
        setFiles((prev) => {
          const merged = { ...prev };
          for (const [k, v] of Object.entries(newFiles)) {
            if (typeof v === "string") merged[k] = v;
          }
          return merged;
        });
        const firstNew = Object.keys(newFiles)[0];
        if (firstNew) setActiveFile(firstNew);
        toast.success(`${Object.keys(newFiles).length} arquivo(s) gerado(s)`);
      }
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
      const fullPrompt = userPrompt + "\n\nGere o site COMPLETO e personalizado em blocos. Formato obrigatório:\n\n### index.html\n```html\n...\n```\n\n### styles.css\n```css\n...\n```\n\n### script.js\n```js\n...\n```\n\nInclua sempre HTML completo com <!DOCTYPE html>, CSS completo com design bonito e responsivo, e JS funcional. Não omita nenhum arquivo. Não responda com texto corrido.";
      const aiText = await callWithFallback([{ role: "user", content: fullPrompt }]);
      const newFiles = parseFilesFromCode(aiText);
      if (Object.keys(newFiles).length === 0) {
        throw new Error("Nenhum arquivo reconhecido na resposta");
      }
      setFiles((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(newFiles)) {
          if (typeof v === "string") merged[k] = v;
        }
        return merged;
      });
      setActiveFile(Object.keys(newFiles)[0]);
      setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
      toast.success(`Gerado tudo: ${Object.keys(newFiles).join(", ")}`);
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

        <div className="flex items-center gap-2 shrink-0 flex-wrap bg-card border rounded-lg px-3 py-2">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">Clonar:</span>
            <Input
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") cloneSite(); }}
              placeholder="https://site-para-clonar.com"
              className="h-7 w-52 text-xs"
            />
            <Button size="sm" variant="outline" className="h-7" onClick={cloneSite} disabled={cloning}>
              {cloning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />} Clonar
            </Button>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Gerador:</span>
            {PROVIDERS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={provider === p.id ? "default" : "outline"}
                onClick={() => setProvider(p.id)}
                title={p.desc}
                className="h-7"
              >
                <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
                {p.label}
              </Button>
            ))}
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Tema:</span>
            {THEMES.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={theme === t.id ? "default" : "outline"}
                onClick={() => applyTheme(t.id)}
                className="h-7"
              >
                {t.label}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
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
            {showCode && fileList.length > 0 ? (
              <EditorPanel files={files} activeFile={activeFile} setActiveFile={setActiveFile} deleteFile={deleteFile} />
            ) : (
              <PreviewPanel html={previewHtml} onOpen={openInNewTab} onFrameRef={(r) => { frameRef.current = r; }} />
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
              <PreviewPanel html={previewHtml} onOpen={openInNewTab} onFrameRef={(r) => { frameRef.current = r; }} fullHeight />
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

function EditToolsPanel({ selected, editText, setEditText, edited, undoCount, onTextApply, onPickImage, onBgColor, onTextColor, onFontDelta, onBold, onItalic, onAlign, onPadDelta, onHide, onRemove, onClearStyle, onUndo, onSave }) {
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

          {selected?.isImg && (
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-muted-foreground">Imagem</Label>
              <Button size="sm" variant="outline" className="h-7 w-full" onClick={onPickImage}>
                <ImagePlus className="w-3 h-3 mr-1" /> Trocar imagem
              </Button>
            </div>
          )}

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

function PreviewPanel({ html, onOpen, onFrameRef, fullHeight }) {
  const frameRef = useRef(null);
  const wrapRef = useRef(null);
  const [dims, setDims] = useState(null);
  const [fit, setFit] = useState(true);

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
  const scale = fit && dims && wrapW > 0 ? Math.min(1, wrapW / dims.w) : 1;
  const scaledW = dims ? Math.max(dims.w * scale, wrapW || 0) : wrapW || "100%";
  const scaledH = dims ? dims.h * scale : 0;

  return (
    <Card className={`flex flex-col ${fullHeight ? "h-full" : ""}`}>
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Eye className="w-4 h-4 text-gold-600" />
        <span className="text-xs font-medium">Preview</span>
        {dims && (
          <div className="flex items-center gap-1 ml-auto">
            <Button size="sm" variant={fit ? "default" : "outline"} className="h-6 px-2" onClick={() => setFit(true)}>
              Página inteira
            </Button>
            <Button size="sm" variant={!fit ? "default" : "outline"} className="h-6 px-2" onClick={() => setFit(false)}>
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
