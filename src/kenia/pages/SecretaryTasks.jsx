import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { Separator } from "@/kenia/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import {
  Mic, Square, Send, Loader2, MessageSquare, Trash2,
  CalendarDays, Plus, Clock, User, Phone, Mail
} from "lucide-react";
import { toast } from "sonner";
import { loadChatConfig } from "@/kenia/storage/chatSecretary";
import { api } from "@/kenia/lib/api";

const STORAGE_KEY = "secretary-tasks:cfg";
const HISTORY_KEY = "secretary-tasks:history";

function loadCfg() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

export default function SecretaryTasks() {
  const [tab, setTab] = useState("chat");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [history, setHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [newAppt, setNewAppt] = useState({ client_name: "", phone: "", email: "", appointment_date: "", appointment_time: "", notes: "" });
  const [showNewAppt, setShowNewAppt] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const cfg = loadCfg();
    setFrom(cfg.from || "whatsapp:+14155238886");
    setTo(cfg.to || "");
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ from, to }));
  }, [from, to]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (tab === "agenda") loadAppointments();
  }, [tab]);

  const loadAppointments = async () => {
    setApptLoading(true);
    try {
      const res = await api.get("/appointments");
      const data = Array.isArray(res?.data) ? res.data : [];
      const now = new Date();
      const upcoming = data
        .filter((a) => {
          const d = a.starts_at || (a.appointment_date && a.appointment_time ? `${a.appointment_date}T${String(a.appointment_time).slice(0, 5)}:00` : null);
          return d && new Date(d) >= now;
        })
        .sort((a, b) => {
          const da = a.starts_at || `${a.appointment_date}T${String(a.appointment_time).slice(0, 5)}:00`;
          const db = b.starts_at || `${b.appointment_date}T${String(b.appointment_time).slice(0, 5)}:00`;
          return new Date(da) - new Date(db);
        })
        .slice(0, 10);
      setAppointments(upcoming);
    } catch {
      setAppointments([]);
    } finally {
      setApptLoading(false);
    }
  };

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
      setMessage((prev) => (prev ? prev + "\n" : text));
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
      toast.success("Tarefa enviada para o WhatsApp da secretária");
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

  const sendChat = async () => {
    if (!chatInput.trim() || chatSending) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatSending(true);
    try {
      const currentPrompt = loadChatConfig().prompt || "";
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: {
          message: userMsg,
          history: chatMessages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          session_id: "secretary-tasks-chat",
          prompt: currentPrompt || undefined,
        },
      });
      if (error) throw error;
      const reply = data?.response || "Sem resposta.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error("Erro no chat: " + (e?.message || e));
    } finally {
      setChatSending(false);
    }
  };

  const createAppointment = async () => {
    if (!newAppt.client_name || !newAppt.appointment_date || !newAppt.appointment_time) {
      toast.error("Preencha nome, data e horário.");
      return;
    }
    try {
      await api.post("/appointments", {
        client_name: newAppt.client_name,
        phone: newAppt.phone,
        email: newAppt.email,
        appointment_date: newAppt.appointment_date,
        appointment_time: newAppt.appointment_time,
        notes: newAppt.notes,
        source: "secretary-tasks",
      });
      toast.success("Compromisso criado!");
      setNewAppt({ client_name: "", phone: "", email: "", appointment_date: "", appointment_time: "", notes: "" });
      setShowNewAppt(false);
      loadAppointments();
    } catch (e) {
      toast.error("Erro ao criar: " + (e?.message || e));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Agenda IA
          </h1>
          <p className="text-xs text-muted-foreground">
            Chat com IA, envio de tarefas e gerenciamento de compromissos.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="chat"><MessageSquare className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
          <TabsTrigger value="agenda"><CalendarDays className="w-3 h-3 mr-1" /> Agenda</TabsTrigger>
          <TabsTrigger value="whatsapp"><Send className="w-3 h-3 mr-1" /> WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <Card className="flex flex-col h-[calc(100dvh-16rem)]">
            <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Converse com a IA para planejar tarefas e compromissos.</p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                    m.role === "user" ? "bg-gold-100 text-gold-900" : "bg-muted text-foreground"
                  }`}>
                    <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.content}</div>
                  </div>
                </div>
              ))}
              {chatSending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Pensando...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <Separator />
            <div className="p-3">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Pergunte sobre compromissos, tarefas..."
                  disabled={chatSending}
                />
                <Button size="sm" onClick={sendChat} disabled={chatSending || !chatInput.trim()}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <div className="grid lg:grid-cols-[1fr_300px] gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-sm">Compromissos</h2>
                <Button size="sm" onClick={() => setShowNewAppt(!showNewAppt)}>
                  <Plus className="w-3 h-3 mr-1" /> Novo
                </Button>
              </div>
              {showNewAppt && (
                <Card className="p-3 mb-4 space-y-2 border-gold-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Cliente *</Label>
                      <Input value={newAppt.client_name} onChange={(e) => setNewAppt({ ...newAppt, client_name: e.target.value })} placeholder="Nome" className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Telefone</Label>
                      <Input value={newAppt.phone} onChange={(e) => setNewAppt({ ...newAppt, phone: e.target.value })} placeholder="(00) 00000-0000" className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Data *</Label>
                      <Input type="date" value={newAppt.appointment_date} onChange={(e) => setNewAppt({ ...newAppt, appointment_date: e.target.value })} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Horário *</Label>
                      <Input type="time" value={newAppt.appointment_time} onChange={(e) => setNewAppt({ ...newAppt, appointment_time: e.target.value })} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px]">Notas</Label>
                    <Input value={newAppt.notes} onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })} placeholder="Observações" className="h-8 text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={createAppointment}>Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewAppt(false)}>Cancelar</Button>
                  </div>
                </Card>
              )}
              {apptLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando...
                </div>
              ) : appointments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum compromisso futuro.</p>
              ) : (
                <div className="space-y-2">
                  {appointments.map((appt) => {
                    const dt = appt.starts_at || (appt.appointment_date && appt.appointment_time ? `${appt.appointment_date}T${String(appt.appointment_time).slice(0, 5)}:00` : null);
                    const dateObj = dt ? new Date(dt) : null;
                    return (
                      <div key={appt.id} className="flex items-start gap-3 p-2 rounded-lg border text-xs hover:bg-muted/50 transition-colors">
                        <CalendarDays className="w-4 h-4 text-gold-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{appt.title || appt.client_name || "Compromisso"}</div>
                          {appt.client_name && appt.title && <div className="text-muted-foreground truncate">{appt.client_name}</div>}
                          {dateObj && (
                            <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {dateObj.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                              {" as "}
                              {dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                        </div>
                        <Badge variant={appt.status === "confirmado" || appt.status === "scheduled" ? "default" : "secondary"} className="text-[9px] shrink-0">
                          {appt.status === "scheduled" ? "Confirmado" : appt.status || "Pendente"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-3">
              <h3 className="text-xs font-medium mb-3">Configurações WhatsApp</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px]">Para (Secretária)</Label>
                  <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+5511999999999" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">De (Twilio)</Label>
                  <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="whatsapp:+14155238886" className="h-8 text-xs" />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <Card className="p-4 space-y-4 max-w-2xl">
            <div>
              <Label>WhatsApp da Secretária (To)</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+5511999999999" />
            </div>
            <div>
              <Label>Número de envio Twilio (From)</Label>
              <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="whatsapp:+14155238886" />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Ex: Ligar para o cliente João às 14h..."
                maxLength={1500}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">{message.length}/1500</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!recording ? (
                <Button type="button" variant="outline" onClick={startRecording} disabled={transcribing || sending}>
                  <Mic className="w-4 h-4 mr-2" /> Gravar voz
                </Button>
              ) : (
                <Button type="button" variant="destructive" onClick={stopRecording}>
                  <Square className="w-4 h-4 mr-2" /> Parar
                </Button>
              )}
              {transcribing && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Transcrevendo...
                </Badge>
              )}
              <div className="flex-1" />
              <Button onClick={send} disabled={sending || transcribing}>
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar para WhatsApp
              </Button>
            </div>
          </Card>

          <Card className="p-4 mt-4 max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm">Histórico</h2>
              {history.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearHistory}>
                  <Trash2 className="w-3 h-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa enviada ainda.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="text-xs border rounded-md p-2">
                    <div className="text-[10px] text-muted-foreground mb-1">{new Date(h.at).toLocaleString("pt-BR")}</div>
                    <div className="whitespace-pre-wrap">{h.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
