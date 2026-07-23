import { useState, useRef, useEffect, useCallback, Component } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import {
  Send, Loader2, Code2, Eye, FileCode, Download,
  MessageSquare, FolderTree, ExternalLink, Trash2
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "site-builder:state";

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
    if (html && html.includes("<!DOCTYPE") && !css && !js) return html;

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

  const previewHtml = buildPreviewHtml(files);
  const fileList = Object.keys(files);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("site-builder", {
        body: { message: userMsg, history, project_files: files },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiText = String(data?.response || "Resposta vazia.");
      const newFiles = data?.files && typeof data.files === "object" ? data.files : {};

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
        toast.success(`${Object.keys(newFiles).length} arquivo(s) atualizado(s)`);
      }
    } catch (e) {
      const msg = e?.message || String(e);
      toast.error("Erro: " + msg);
      setMessages((prev) => [...prev, { role: "assistant", content: "Erro ao gerar codigo: " + msg }]);
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
      <div className="p-4 h-[calc(100dvh-4rem)] flex flex-col gap-4">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Code2 className="w-5 h-5" /> Construtor de Sites
            </h1>
            <p className="text-xs text-muted-foreground">
              Descreva o site que deseja e a IA gera o codigo para voce.
            </p>
          </div>
          <div className="flex gap-2">
            {fileList.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={openInNewTab}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                </Button>
                <Button size="sm" variant="outline" onClick={downloadZip}>
                  <Download className="w-3 h-3 mr-1" /> Download
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={clearAll}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 hidden lg:grid lg:grid-cols-[1fr_1.2fr_1fr] gap-3">
          <ChatPanel messages={messages} input={input} setInput={setInput} sending={sending} send={send} handleKeyDown={handleKeyDown} chatEndRef={chatEndRef} />
          <EditorPanel files={files} activeFile={activeFile} setActiveFile={setActiveFile} deleteFile={deleteFile} />
          <PreviewPanel html={previewHtml} onOpen={openInNewTab} />
        </div>

        <div className="flex-1 min-h-0 lg:hidden">
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="h-full flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="chat"><MessageSquare className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
              <TabsTrigger value="editor"><FileCode className="w-3 h-3 mr-1" /> Editor</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="w-3 h-3 mr-1" /> Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 min-h-0 mt-2">
              <ChatPanel messages={messages} input={input} setInput={setInput} sending={sending} send={send} handleKeyDown={handleKeyDown} chatEndRef={chatEndRef} fullHeight />
            </TabsContent>
            <TabsContent value="editor" className="flex-1 min-h-0 mt-2">
              <EditorPanel files={files} activeFile={activeFile} setActiveFile={setActiveFile} deleteFile={deleteFile} fullHeight />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 min-h-0 mt-2">
              <PreviewPanel html={previewHtml} onOpen={openInNewTab} fullHeight />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SiteBuilderErrorBoundary>
  );
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
                <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.content}</div>
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

function PreviewPanel({ html, onOpen, fullHeight }) {
  const frameRef = useRef(null);

  useEffect(() => {
    if (frameRef.current && html) {
      try {
        frameRef.current.srcdoc = html;
      } catch {}
    }
  }, [html]);

  return (
    <Card className={`flex flex-col ${fullHeight ? "h-full" : ""}`}>
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Eye className="w-4 h-4 text-gold-600" />
        <span className="text-xs font-medium">Preview</span>
        {html && (
          <Button size="sm" variant="ghost" className="ml-auto h-6 px-2" onClick={onOpen}>
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0 bg-white">
        {html ? (
          <iframe
            ref={frameRef}
            srcDoc={html}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Preview"
          />
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
