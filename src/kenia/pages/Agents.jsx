import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/kenia/components/ui/card";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Save, Send, GraduationCap } from "lucide-react";

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (rápido)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (qualidade)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "openai/gpt-5-mini", label: "GPT-5 mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
];

const EMPTY = {
  id: null, name: "", role: "", model: MODELS[0].value,
  system_prompt: "", knowledge: "", temperature: 0.7,
};

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [current, setCurrent] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("ai_agents").select("*").order("updated_at", { ascending: false });
    if (error) return toast.error(error.message);
    setAgents(data || []);
  };
  useEffect(() => { load(); }, []);

  const newAgent = () => { setCurrent(EMPTY); setChat([]); };
  const pick = (a) => { setCurrent(a); setChat([]); };

  const save = async () => {
    if (!current.name.trim()) return toast.error("Dê um nome ao agente");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return toast.error("Faça login"); }
    const payload = {
      user_id: user.id,
      name: current.name.trim(),
      role: current.role || null,
      model: current.model,
      system_prompt: current.system_prompt || "",
      knowledge: current.knowledge || "",
      temperature: Number(current.temperature) || 0.7,
    };
    let res;
    if (current.id) {
      res = await supabase.from("ai_agents").update(payload).eq("id", current.id).select().single();
    } else {
      res = await supabase.from("ai_agents").insert(payload).select().single();
    }
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    setCurrent(res.data);
    toast.success("Agente salvo");
    load();
  };

  const remove = async () => {
    if (!current.id) return;
    if (!confirm("Excluir agente?")) return;
    const { error } = await supabase.from("ai_agents").delete().eq("id", current.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    newAgent(); load();
  };

  const send = async () => {
    if (!current.id) return toast.error("Salve o agente antes de testar");
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input.trim() };
    const next = [...chat, userMsg];
    setChat(next); setInput(""); setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ agent_id: current.id, messages: next }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setChat([...next, { role: "assistant", content: j.text || "(sem resposta)" }]);
    } catch (e) {
      toast.error(e.message || "Falha ao conversar");
      setChat(next);
    } finally { setSending(false); }
  };

  return (
    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      {/* Lista */}
      <Card className="lg:sticky lg:top-4 h-fit">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4" /> Meus Agentes</CardTitle>
          <Button size="sm" variant="outline" onClick={newAgent}><Plus className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {agents.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agente ainda.</p>}
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => pick(a)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted ${current.id === a.id ? "bg-muted font-medium" : ""}`}
            >
              {a.name}
              {a.role && <span className="block text-xs text-muted-foreground">{a.role}</span>}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Editor + treinamento + chat */}
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>{current.id ? "Editar agente" : "Criar novo agente"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-1">
              <label className="text-sm font-medium">Nome</label>
              <Input value={current.name} onChange={(e) => setCurrent({ ...current, name: e.target.value })} placeholder="Ex.: Assistente Jurídico" />
            </div>
            <div>
              <label className="text-sm font-medium">Papel / função</label>
              <Input value={current.role || ""} onChange={(e) => setCurrent({ ...current, role: e.target.value })} placeholder="Ex.: Advogado consultor" />
            </div>
            <div>
              <label className="text-sm font-medium">Modelo</label>
              <select
                className="w-full h-10 px-3 rounded-md border bg-background"
                value={current.model}
                onChange={(e) => setCurrent({ ...current, model: e.target.value })}
              >
                {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Temperatura ({current.temperature})</label>
              <input type="range" min="0" max="1.5" step="0.1"
                value={current.temperature}
                onChange={(e) => setCurrent({ ...current, temperature: e.target.value })}
                className="w-full" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Instruções (system prompt)</label>
              <Textarea rows={6} value={current.system_prompt}
                onChange={(e) => setCurrent({ ...current, system_prompt: e.target.value })}
                placeholder="Descreva personalidade, tom de voz, limites e objetivos do agente." />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Treinamento (base de conhecimento)
              </label>
              <Textarea rows={10} value={current.knowledge}
                onChange={(e) => setCurrent({ ...current, knowledge: e.target.value })}
                placeholder="Cole aqui FAQs, processos, scripts, regras internas, documentos, exemplos de perguntas e respostas... O agente usará esse texto como referência para responder." />
              <p className="text-xs text-muted-foreground mt-1">
                Dica: estruture em seções (### Sobre / ### FAQ / ### Procedimentos). Tudo aqui é injetado como contexto fixo.
              </p>
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              {current.id && (
                <Button variant="destructive" onClick={remove}><Trash2 className="w-4 h-4 mr-1" /> Excluir</Button>
              )}
              <Button onClick={save} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Testar agente</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-md p-3 h-72 overflow-auto bg-muted/30 space-y-2 mb-3">
              {chat.length === 0 && <p className="text-sm text-muted-foreground">Salve o agente e envie uma mensagem para testar.</p>}
              {chat.map((m, i) => (
                <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : "text-left"}`}>
                  <span className={`inline-block px-3 py-2 rounded-lg ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                    {m.content}
                  </span>
                </div>
              ))}
              {sending && <p className="text-xs text-muted-foreground">digitando…</p>}
            </div>
            <div className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Pergunte algo ao agente..." disabled={!current.id || sending} />
              <Button onClick={send} disabled={!current.id || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
