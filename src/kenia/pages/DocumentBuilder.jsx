import { useState, useRef, useEffect, useCallback, Component } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import {
  Send, Loader2, FileText, Eye, FileCode, Download,
  MessageSquare, FolderTree, ExternalLink, Trash2, Scale, Copy
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "document-builder:state";

const DOCUMENT_TYPES = [
  { value: "peticao-inicial", label: "Petição Inicial" },
  { value: "contestacao", label: "Contestação" },
  { value: "contrato", label: "Contrato" },
  { value: "procuracao", label: "Procuração" },
  { value: "parecer", label: "Parecer Jurídico" },
  { value: "recurso", label: "Recurso" },
  { value: "acordo", label: "Acordo" },
  { value: "notificacao", label: "Notificação Extrajudicial" },
  { value: "memorial", label: "Memorial de Contraditório" },
  { value: "outro", label: "Outro" },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-50) : [],
      documents: parsed.documents && typeof parsed.documents === "object" ? parsed.documents : {},
      activeDocument: typeof parsed.activeDocument === "string" ? parsed.activeDocument : "",
    };
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return {};
  }
}

function buildDocumentPreviewHtml(documents) {
  try {
    const html = documents["documento.html"] || "";
    const css = documents["estilos.css"] || "";

    if (!html && !css) {
      const txt = documents["documento.txt"] || "";
      if (!txt) return "";
      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.8; color: #1a1a1a; font-size: 14px; }
  h1, h2, h3 { font-family: 'Times New Roman', Times, serif; text-align: center; margin-bottom: 1em; }
  h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
  p { text-indent: 2em; margin-bottom: 0.8em; text-align: justify; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1em; margin-bottom: 2em; }
  .clause { margin-bottom: 1.5em; }
  .clause-title { font-weight: bold; text-transform: uppercase; margin-bottom: 0.5em; }
  .signature { margin-top: 3em; text-align: center; }
  .signature-line { border-top: 1px solid #333; width: 300px; margin: 2em auto 0.5em; }
</style>
</head>
<body>
<pre style="white-space: pre-wrap; font-family: inherit; text-indent: 0;">${txt.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
    }

    if (html && html.includes("<!DOCTYPE") && !css) return html;

    let fullHtml = "";
    if (html && /<head[\s>]/i.test(html) && /<body[\s>]/i.test(html)) {
      fullHtml = html;
      if (css) {
        if (fullHtml.includes("</head>")) {
          fullHtml = fullHtml.replace("</head>", `<style>\n${css}\n</style>\n</head>`);
        }
      }
    } else if (html) {
      fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.8; color: #1a1a1a; font-size: 14px; }
  h1, h2, h3 { font-family: 'Times New Roman', Times, serif; text-align: center; margin-bottom: 1em; }
  h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
  p { text-indent: 2em; margin-bottom: 0.8em; text-align: justify; }
  ${css || ""}
</style>
</head>
<body>
${html.replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*/i, "") || html}
</body>
</html>`;
    } else {
      fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.8; color: #1a1a1a; font-size: 14px; }
</style>
</head>
<body>
${css ? `<style>\n${css}\n</style>` : ""}
</body>
</html>`;
    }

    return fullHtml;
  } catch {
    return "";
  }
}

class DocumentBuilderErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 flex flex-col items-center justify-center h-full gap-4 text-center">
          <FileText className="w-12 h-12 text-red-400" />
          <h2 className="text-lg font-semibold text-red-600">Erro no Construtor de Documentos</h2>
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

export default function DocumentBuilder() {
  const saved = loadState();
  const [messages, setMessages] = useState(saved.messages || []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [documents, setDocuments] = useState(saved.documents || {});
  const [activeDocument, setActiveDocument] = useState(saved.activeDocument || "");
  const [mobileTab, setMobileTab] = useState("chat");
  const [docType, setDocType] = useState("peticao-inicial");
  const chatEndRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, documents, activeDocument })); } catch {}
  }, [messages, documents, activeDocument]);

  useEffect(() => {
    try { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); } catch {}
  }, [messages]);

  useEffect(() => {
    try {
      if (activeDocument && documents[activeDocument] !== undefined) return;
      const keys = Object.keys(documents);
      if (keys.length > 0) setActiveDocument(keys[0]);
    } catch {}
  }, [documents]);

  const previewHtml = buildDocumentPreviewHtml(documents);
  const docList = Object.keys(documents);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const selectedType = DOCUMENT_TYPES.find((d) => d.value === docType)?.label || "Petição Inicial";
      const { data, error } = await supabase.functions.invoke("document-builder", {
        body: {
          message: userMsg,
          history,
          project_files: documents,
          document_type: selectedType,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiText = String(data?.response || "Resposta vazia.");
      const newFiles = data?.files && typeof data.files === "object" ? data.files : {};

      setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);

      if (Object.keys(newFiles).length > 0) {
        setDocuments((prev) => {
          const merged = { ...prev };
          for (const [k, v] of Object.entries(newFiles)) {
            if (typeof v === "string") merged[k] = v;
          }
          return merged;
        });
        const firstNew = Object.keys(newFiles)[0];
        if (firstNew) setActiveDocument(firstNew);
        toast.success(`${Object.keys(newFiles).length} arquivo(s) atualizado(s)`);
      }
    } catch (e) {
      const msg = e?.message || String(e);
      toast.error("Erro: " + msg);
      setMessages((prev) => [...prev, { role: "assistant", content: "Erro ao gerar documento: " + msg }]);
    } finally {
      setSending(false);
    }
  };

  const downloadDocument = useCallback(() => {
    if (docList.length === 0) { toast.error("Nenhum documento para baixar."); return; }
    try {
      const content = docList.map((path) => `=== ${path} ===\n${documents[path]}`).join("\n\n");
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "documento-juridico.txt";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado");
    } catch (e) {
      toast.error("Erro ao baixar: " + (e?.message || e));
    }
  }, [documents, docList]);

  const openInNewTab = useCallback(() => {
    if (!previewHtml) { toast.error("Nada para visualizar."); return; }
    try {
      const w = window.open("", "_blank");
      if (w) { w.document.write(previewHtml); w.document.close(); }
    } catch (e) {
      toast.error("Erro ao abrir: " + (e?.message || e));
    }
  }, [previewHtml]);

  const copyToClipboard = useCallback(() => {
    const txt = documents["documento.txt"] || documents["documento.html"] || "";
    if (!txt) { toast.error("Nada para copiar."); return; }
    try {
      navigator.clipboard.writeText(txt).then(() => toast.success("Documento copiado!"));
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }, [documents]);

  const clearAll = () => {
    setMessages([]);
    setDocuments({});
    setActiveDocument("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast.success("Projeto limpo");
  };

  const deleteFile = (path) => {
    setDocuments((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    if (activeDocument === path) {
      const remaining = Object.keys(documents).filter((f) => f !== path);
      setActiveDocument(remaining[0] || "");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <DocumentBuilderErrorBoundary>
      <div className="p-4 h-[calc(100dvh-4rem)] flex flex-col gap-4">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" /> Construtor de Documentos
            </h1>
            <p className="text-xs text-muted-foreground">
              Descreva o documento jurídico que deseja e a IA gera para você.
            </p>
          </div>
          <div className="flex gap-2">
            {docList.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-3 h-3 mr-1" /> Copiar
                </Button>
                <Button size="sm" variant="outline" onClick={openInNewTab}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Imprimir
                </Button>
                <Button size="sm" variant="outline" onClick={downloadDocument}>
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
          <ChatPanel
            messages={messages}
            input={input}
            setInput={setInput}
            sending={sending}
            send={send}
            handleKeyDown={handleKeyDown}
            chatEndRef={chatEndRef}
            docType={docType}
            setDocType={setDocType}
          />
          <DocumentPanel documents={documents} activeDocument={activeDocument} setActiveDocument={setActiveDocument} deleteFile={deleteFile} />
          <PreviewPanel html={previewHtml} onOpen={openInNewTab} />
        </div>

        <div className="flex-1 min-h-0 lg:hidden">
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="h-full flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="chat"><MessageSquare className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
              <TabsTrigger value="editor"><FileCode className="w-3 h-3 mr-1" /> Documento</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="w-3 h-3 mr-1" /> Visualizar</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 min-h-0 mt-2">
              <ChatPanel
                messages={messages}
                input={input}
                setInput={setInput}
                sending={sending}
                send={send}
                handleKeyDown={handleKeyDown}
                chatEndRef={chatEndRef}
                docType={docType}
                setDocType={setDocType}
                fullHeight
              />
            </TabsContent>
            <TabsContent value="editor" className="flex-1 min-h-0 mt-2">
              <DocumentPanel documents={documents} activeDocument={activeDocument} setActiveDocument={setActiveDocument} deleteFile={deleteFile} fullHeight />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 min-h-0 mt-2">
              <PreviewPanel html={previewHtml} onOpen={openInNewTab} fullHeight />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DocumentBuilderErrorBoundary>
  );
}

function ChatPanel({ messages, input, setInput, sending, send, handleKeyDown, chatEndRef, docType, setDocType, fullHeight }) {
  return (
    <Card className={`flex flex-col ${fullHeight ? "h-full" : ""}`}>
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gold-600" />
        <span className="text-xs font-medium">Chat com IA</span>
      </div>
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Descreva o documento jurídico que deseja criar.</p>
            <p className="text-xs mt-1">Ex: "Crie uma petição inicial para ação de indenização por danos morais"</p>
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
              <Loader2 className="w-3 h-3 animate-spin" /> Gerando documento...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>
      <div className="p-3 border-t space-y-2">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full text-xs border border-nude-200 rounded-md px-2 py-1.5 bg-white text-nude-800 focus:outline-none focus:ring-2 focus:ring-gold-300"
        >
          {DOCUMENT_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>{dt.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Descreva o documento..." disabled={sending} />
          <Button size="sm" onClick={send} disabled={sending || !input.trim()}>
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DocumentPanel({ documents, activeDocument, setActiveDocument, deleteFile, fullHeight }) {
  const docList = Object.keys(documents);
  const content = documents[activeDocument] || "";

  return (
    <Card className={`flex flex-col ${fullHeight ? "h-full" : ""}`}>
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-gold-600" />
        <span className="text-xs font-medium">Arquivos do Documento</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">{docList.length}</Badge>
      </div>
      {docList.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
          <div className="text-center">
            <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Nenhum documento gerado ainda.</p>
            <p className="text-xs mt-1">Use o chat para descrever o documento.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex gap-1 px-2 py-1.5 border-b overflow-x-auto shrink-0">
            {docList.map((path) => (
              <button
                key={path}
                onClick={() => setActiveDocument(path)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] whitespace-nowrap transition-colors ${
                  activeDocument === path
                    ? "bg-gold-100 text-gold-700 font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <FileText className="w-3 h-3" />
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
        <span className="text-xs font-medium">Visualizar</span>
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
            title="Preview do Documento"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            <div className="text-center">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>O documento aparecerá aqui.</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
