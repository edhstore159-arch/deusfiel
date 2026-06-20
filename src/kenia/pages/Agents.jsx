import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Separator } from "@/kenia/components/ui/separator";
import { Switch } from "@/kenia/components/ui/switch";
import { Bot, Plus, Save, Trash2, Sparkles, Copy, Upload, X } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "kenia_ai_agents_v1";

const AREAS = [
  "Trabalhista", "Cível", "Família", "Criminal",
  "Tributário", "Previdenciário", "Consumidor", "Empresarial",
];

const TONES = ["Cordial", "Formal", "Empática", "Objetiva", "Consultiva"];

const MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (rápido)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (avançado)" },
  { id: "openai/gpt-5.2", label: "GPT 5.2 (premium)" },
];

const blankAgent = () => ({
  id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  area: AREAS[0],
  tone: TONES[0],
  model: MODELS[0].id,
  greeting: "Olá! Sou a secretária jurídica. Como posso ajudar?",
  goal: "Qualificar o lead, identificar a área jurídica e sugerir próximos passos.",
  instructions: "",
  avatar: "",
  active: true,
  createdAt: new Date().toISOString(),
});

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const readAgents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const writeAgents = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    const list = readAgents();
    setAgents(list);
    if (list.length) {
      setSelectedId(list[0].id);
      setDraft(list[0]);
    } else {
      const a = blankAgent();
      setDraft(a);
    }
  }, []);

  const selected = useMemo(
    () => agents.find((a) => a.id === selectedId) || null,
    [agents, selectedId]
  );

  const startNew = () => {
    const a = blankAgent();
    setSelectedId(null);
    setDraft(a);
  };

  const saveDraft = () => {
    if (!draft?.name?.trim()) {
      toast.error("Dê um nome ao agente");
      return;
    }
    let next;
    if (agents.some((a) => a.id === draft.id)) {
      next = agents.map((a) => (a.id === draft.id ? draft : a));
    } else {
      next = [draft, ...agents];
    }
    setAgents(next);
    writeAgents(next);
    setSelectedId(draft.id);
    toast.success("Agente salvo");
  };

  const removeAgent = (id) => {
    const next = agents.filter((a) => a.id !== id);
    setAgents(next);
    writeAgents(next);
    if (selectedId === id) {
      const first = next[0];
      setSelectedId(first?.id || null);
      setDraft(first || blankAgent());
    }
    toast.success("Agente removido");
  };

  const duplicate = (a) => {
    const copy = { ...a, id: `agent-${Date.now()}`, name: `${a.name} (cópia)`, createdAt: new Date().toISOString() };
    const next = [copy, ...agents];
    setAgents(next);
    writeAgents(next);
    setSelectedId(copy.id);
    setDraft(copy);
  };

  const toggleActive = (id, value) => {
    const next = agents.map((a) => (a.id === id ? { ...a, active: value } : a));
    setAgents(next);
    writeAgents(next);
    if (draft?.id === id) setDraft({ ...draft, active: value });
    toast.success(value ? "Agente ativado" : "Agente desativado");
  };

  const onAvatarPick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter até 2MB"); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      setDraft((d) => ({ ...d, avatar: dataUrl }));
    } catch {
      toast.error("Falha ao carregar imagem");
    }
  };

  const buildSystemPrompt = (a) => [
    `Você é "${a.name}", uma secretária jurídica especializada em ${a.area}.`,
    `Tom de voz: ${a.tone}.`,
    `Objetivo principal: ${a.goal}`,
    a.greeting && `Apresentação inicial: "${a.greeting}"`,
    a.instructions && `Instruções adicionais:\n${a.instructions}`,
    "Nunca diga que é uma IA. Responda de forma clara, humanizada e profissional.",
  ].filter(Boolean).join("\n\n");

  const copyPrompt = () => {
    if (!draft) return;
    navigator.clipboard.writeText(buildSystemPrompt(draft));
    toast.success("Prompt copiado");
  };

  if (!draft) return null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline text-gold-600">Inteligência</div>
          <h1 className="font-serif text-3xl text-nude-900 mt-1 flex items-center gap-2">
            <Bot className="w-7 h-7 text-gold-600" /> Agentes de IA
          </h1>
          <p className="text-sm text-nude-500 mt-1">
            Crie e configure agentes para atender áreas e canais diferentes.
          </p>
        </div>
        <Button onClick={startNew} className="bg-gold-600 hover:bg-gold-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> Novo agente
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* LIST */}
        <Card className="col-span-12 lg:col-span-4 border-nude-200 overflow-hidden">
          <div className="p-4 border-b border-nude-200">
            <div className="text-xs uppercase tracking-widest text-nude-500 font-semibold">
              Meus agentes
            </div>
            <div className="text-xs text-nude-400 mt-1">{agents.length} configurado(s)</div>
          </div>
          <ScrollArea className="h-[560px]">
            {agents.length === 0 ? (
              <div className="p-6 text-sm text-nude-400 text-center">
                Nenhum agente ainda. Configure ao lado e clique em salvar.
              </div>
            ) : (
              <ul className="divide-y divide-nude-100">
                {agents.map((a) => (
                  <li
                    key={a.id}
                    className={`p-4 cursor-pointer hover:bg-nude-50 ${selectedId === a.id ? "bg-gold-50/50" : ""}`}
                    onClick={() => { setSelectedId(a.id); setDraft(a); }}
                  >
                    <div className="flex items-start gap-3">
                      {a.avatar ? (
                        <img src={a.avatar} alt={a.name} className="w-10 h-10 rounded-full object-cover border border-nude-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-nude-100 border border-nude-200 flex items-center justify-center shrink-0">
                          <Bot className="w-5 h-5 text-nude-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-nude-900 truncate">{a.name || "Sem nome"}</div>
                        <div className="text-xs text-nude-500 mt-0.5 truncate">{a.area} · {a.tone}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {MODELS.find((m) => m.id === a.model)?.label || a.model}
                          </Badge>
                          <Badge className={`text-[10px] ${a.active ? "bg-gold-600 text-white" : "bg-nude-200 text-nude-600"}`}>
                            {a.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Switch checked={!!a.active} onCheckedChange={(v) => toggleActive(a.id, v)} />
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); duplicate(a); }}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); removeAgent(a.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </Card>

        {/* EDITOR */}
        <Card className="col-span-12 lg:col-span-8 border-nude-200">
          <div className="p-5 border-b border-nude-200 flex items-center justify-between">
            <div>
              <div className="overline text-gold-600">Configuração</div>
              <h2 className="font-serif text-xl text-nude-900 mt-1">
                {selected ? "Editar agente" : "Novo agente"}
              </h2>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyPrompt} className="gap-1.5">
                <Sparkles className="w-4 h-4" /> Copiar prompt
              </Button>
              <Button onClick={saveDraft} className="bg-gold-600 hover:bg-gold-700 text-white gap-1.5">
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              {draft.avatar ? (
                <img src={draft.avatar} alt="Avatar do agente" className="w-20 h-20 rounded-full object-cover border border-nude-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-nude-100 border border-nude-200 flex items-center justify-center">
                  <Bot className="w-9 h-9 text-nude-400" />
                </div>
              )}
              <div className="flex-1">
                <div className="text-xs uppercase tracking-widest text-nude-500 font-semibold">Imagem do agente</div>
                <p className="text-xs text-nude-400 mt-1">PNG ou JPG, até 2MB.</p>
                <div className="flex gap-2 mt-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { onAvatarPick(e.target.files?.[0]); e.target.value = ""; }}
                  />
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => avatarInputRef.current?.click()}>
                    <Upload className="w-4 h-4" /> {draft.avatar ? "Trocar imagem" : "Enviar imagem"}
                  </Button>
                  {draft.avatar && (
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-rose-600 hover:bg-rose-50" onClick={() => setDraft({ ...draft, avatar: "" })}>
                      <X className="w-4 h-4" /> Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-nude-500 font-semibold">Nome do agente</label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Ex.: Dra. Ana — Trabalhista"
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-nude-500 font-semibold">Área</label>
                <select
                  value={draft.area}
                  onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                  className="mt-1.5 w-full h-10 px-3 rounded-md border border-nude-200 bg-white text-sm"
                >
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-nude-500 font-semibold">Tom de voz</label>
                <select
                  value={draft.tone}
                  onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
                  className="mt-1.5 w-full h-10 px-3 rounded-md border border-nude-200 bg-white text-sm"
                >
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-nude-500 font-semibold">Modelo</label>
                <select
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  className="mt-1.5 w-full h-10 px-3 rounded-md border border-nude-200 bg-white text-sm"
                >
                  {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-xs uppercase tracking-widest text-nude-500 font-semibold">Mensagem de apresentação</label>
              <Input
                value={draft.greeting}
                onChange={(e) => setDraft({ ...draft, greeting: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-nude-500 font-semibold">Objetivo do agente</label>
              <Textarea
                value={draft.goal}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
                rows={2}
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-nude-500 font-semibold">
                Instruções específicas (opcional)
              </label>
              <Textarea
                value={draft.instructions}
                onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                rows={6}
                placeholder="Ex.: Sempre solicitar TRCT e holerites. Encaminhar urgências para a agenda…"
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-nude-200 bg-nude-50/50 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-nude-900">Agente ativo</div>
                <p className="text-xs text-nude-500 mt-0.5">
                  Quando desativado, o agente não responde em nenhum canal.
                </p>
              </div>
              <Switch
                checked={!!draft.active}
                onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              />
            </div>

            <Separator />

            <div>
              <div className="text-xs uppercase tracking-widest text-nude-500 font-semibold mb-2">
                Prévia do prompt do sistema
              </div>
              <pre className="text-xs text-nude-700 bg-nude-50 border border-nude-200 rounded-md p-3 whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto">
                {buildSystemPrompt(draft)}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
