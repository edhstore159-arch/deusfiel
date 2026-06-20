import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { Mic, Square, Send, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "secretary-tasks:cfg";
const HISTORY_KEY = "secretary-tasks:history";

function loadCfg() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

export default function SecretaryTasks() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [history, setHistory] = useState([]);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    const cfg = loadCfg();
    setFrom(cfg.from || "whatsapp:+14155238886");
    setTo(cfg.to || "");
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ from, to }));
  }, [from, to]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1024) { toast.error("Gravação muito curta, tente novamente."); return; }
        await transcribe(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Permita o uso do microfone para gravar.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob) => {
    setTranscribing(true);
    try {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio_base64: b64, mime_type: blob.type || "audio/webm" },
      });
      if (error) throw error;
      const text = (data?.text || data?.transcript || "").trim();
      if (!text) { toast.error("Não consegui entender o áudio."); return; }
      setMessage((prev) => (prev ? prev + "\n" + text : text));
      toast.success("Áudio transcrito");
    } catch (e) {
      toast.error("Falha ao transcrever: " + (e?.message || e));
    } finally {
      setTranscribing(false);
    }
  };

  const send = async () => {
    if (!to.trim()) { toast.error("Informe o WhatsApp da secretária."); return; }
    if (!from.trim()) { toast.error("Informe o número de envio (From)."); return; }
    if (!message.trim()) { toast.error("Escreva ou grave uma mensagem."); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-secretary-task", {
        body: { to: to.trim(), from: from.trim(), message: message.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const entry = { id: data?.sid || Date.now(), message: message.trim(), at: new Date().toISOString() };
      const next = [entry, ...history].slice(0, 30);
      setHistory(next);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setMessage("");
      toast.success("Tarefa enviada para o WhatsApp da secretária ✅");
    } catch (e) {
      toast.error("Falha ao enviar: " + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" /> Tarefas para Secretária
        </h1>
        <p className="text-sm text-muted-foreground">
          Envie tarefas por voz ou texto direto para o WhatsApp da secretária.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>WhatsApp da Secretária (To)</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+5511999999999"
            />
          </div>
          <div>
            <Label>Número de envio Twilio (From)</Label>
            <Input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="whatsapp:+14155238886"
            />
          </div>
        </div>

        <div>
          <Label>Mensagem</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Ex: Ligar para o cliente João às 14h e confirmar consulta de amanhã."
            maxLength={1500}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {message.length}/1500
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <Button
              type="button"
              variant="outline"
              onClick={startRecording}
              disabled={transcribing || sending}
            >
              <Mic className="w-4 h-4 mr-2" /> Gravar voz
            </Button>
          ) : (
            <Button type="button" variant="destructive" onClick={stopRecording}>
              <Square className="w-4 h-4 mr-2" /> Parar
            </Button>
          )}
          {transcribing && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Transcrevendo…
            </Badge>
          )}
          <div className="flex-1" />
          <Button onClick={send} disabled={sending || transcribing}>
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar para WhatsApp
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Histórico recente</h2>
          {history.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearHistory}>
              <Trash2 className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa enviada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="text-sm border rounded-md p-2">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(h.at).toLocaleString("pt-BR")}
                </div>
                <div className="whitespace-pre-wrap">{h.message}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
