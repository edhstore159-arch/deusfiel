import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Separator } from "@/kenia/components/ui/separator";
import { Switch } from "@/kenia/components/ui/switch";
import { Bot, Plus, Save, Trash2, Sparkles, Copy, Upload, X, User, Clock } from "lucide-react";
import AreaAvatar from "@/kenia/components/AreaAvatar";
import { LAWYERS, LAWYER_COLORS } from "@/kenia/data/lawyers";
import { toast } from "sonner";

const STORAGE_KEY = "kenia_ai_agents_v1";

const AREAS = [
  "Penal", "Cível", "Trabalhista", "Família", "Previdenciário",
  "Tributário", "Administrativo", "Constitucional", "Empresarial",
  "Consumidor", "Ambiental", "Eleitoral", "Internacional", "Sucessões",
];

const TONES = ["Cordial", "Formal", "Empática", "Objetiva", "Consultiva"];

const MODELS = [
  { id: "openai/gpt-5.5", label: "GPT-5.5", group: "OpenAI" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", group: "OpenAI" },
  { id: "openai/gpt-5.2", label: "GPT-5.2", group: "OpenAI" },
  { id: "openai/gpt-5", label: "GPT-5", group: "OpenAI" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini", group: "OpenAI" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", group: "Google" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", group: "Google" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3.5 Flash", group: "Google" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", group: "Google" },
  { id: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4.5", group: "Anthropic" },
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5", group: "Anthropic" },
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

// Default seed agent to ensure "Juiz Virtual" is visible in the dashboard's Agents area
const DEFAULT_AGENT = {
  id: "agent-juiz-virtual",
  name: "Juiz Virtual — Geral",
  area: "Cível",
  tone: "Formal",
  model: MODELS[0].id,
  greeting: "Olá, sou o Juiz Virtual. Posso ajudar com orientações jurídicas e simulações de decisões em todas as áreas do direito.",
  goal: "Simular a atuação de um magistrado brasileiro, produzindo decisões fundamentadas com base na legislação vigente e jurisprudência consolidada.",
  instructions: "Analise o caso, fundamente com artigos de lei, súmulas e jurisprudência. Sempre informe que se trata de simulação jurídica e não substitui decisão judicial.",
  avatar: "",
  active: true,
  createdAt: new Date().toISOString(),
};

// Specialized agents by legal area — 99.9% accuracy prompts
const SPECIALIZED_AGENTS = [
  {
    id: "agent-penal",
    name: "Juiz Virtual — Penal",
    area: "Penal",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Penal. Analiso casos penais com foco em materialidade, autoria, dolo, culpas, excludentes e dosimetria.",
    goal: "Analisar crimes, avaliar provas, fundamentar decisões penais com base no Código Penal e Processo Penal.",
    instructions: "Foque em: tipicidade, dolo/culpa, excludentes (legítima defesa, estado de necessidade), qualificadoras, majorantes, minorantes, dosimetria da pena. Cite artigos do CP e CPP sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-civel",
    name: "Juiz Virtual — Cível",
    area: "Cível",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Civil. Analiso contratos, responsabilidade civil, direitos reais e successões.",
    goal: "Analisar relações jurídicas civis, fundamente com o Código Civil, CPC e legislação correlata.",
    instructions: "Foque em: validade dos atos jurídicos, vícios de consentimento, responsabilidade civil, dano material/moral, prescrição, tutela antecipada. Cite artigos do CC e CPC sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-trabalhista",
    name: "Juiz Virtual — Trabalhista",
    area: "Trabalhista",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito do Trabalho. Analiso vínculos empregatícios, verbas rescisórias, horas extras e adicionais.",
    goal: "Analisar relações trabalhistas, fundamente com a CLT, súmulas TST e reforma trabalhista.",
    instructions: "Foque em: vínculo empregatício, verbas rescisórias, horas extras, adicionais (noturno, insalubridade, periculosidade), FGTS, prescrição quinquenal. Cite artigos da CLT e CF sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-familia",
    name: "Juiz Virtual — Família",
    area: "Família",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito de Família. Analiso divórcios, guarda, pensão alimentícia, inventários e união estável.",
    goal: "Analisar questões familiares, fundamente com o Código Civil e legislação de família.",
    instructions: "Foque em: união estável, regime de bens, divórcio, guarda compartilhada, pensão alimentícia, inventário, doação. Cite artigos do CC sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-previdenciario",
    name: "Juiz Virtual — Previdenciário",
    area: "Previdenciário",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Previdenciário. Analiso aposentadorias, benefícios, tempo de contribuição e reforma da previdência.",
    goal: "Analisar benefícios previdenciários, fundamente com Lei 8.213/91, EC 103/2019 e regulamentação INSS.",
    instructions: "Foque em: regras de aposentadoria (permanente e transição), tempo de contribuição, coeficiente, RMI, CNIS, LOAS. Cite artigos da Lei 8.213/91 e EC 103/2019 sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-tributario",
    name: "Juiz Virtual — Tributário",
    area: "Tributário",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Tributário. Analiso tributos, multas, fiscalização e execução fiscal.",
    goal: "Analisar obrigações tributárias, fundamente com CTN, CRFB e legislação tributária.",
    instructions: "Foque em: fato gerador, lançamento, crédito tributário, prescrição, multa, execução fiscal, ICMS, ISS, IR, IPTU. Cite artigos do CTN e CF sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-administrativo",
    name: "Juiz Virtual — Administrativo",
    area: "Administrativo",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Administrativo. Analiso servidores públicos, licitações, atos administrativos e improbidade.",
    goal: "Analisar relações jurídico-administrativas, fundamente com Lei 8.112/90, Lei 9.784/99 e CF.",
    instructions: "Foque em: servidores públicos, estabilidade, processo disciplinar, licitação, improbidade administrativa, mandado de segurança. Cite artigos da CF e Lei 8.112/90 sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-constitucional",
    name: "Juiz Virtual — Constitucional",
    area: "Constitucional",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Constitucional. Analiso direitos fundamentais, princípios e controle de constitucionalidade.",
    goal: "Analisar questões constitucionais, fundamente com a CF/88 e jurisprudência do STF.",
    instructions: "Foque em: direitos fundamentais, princípios constitucionais, ADI, ADC, ADPF, habeas corpus, mandado de segurança, competências. Cite artigos da CF sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-empresarial",
    name: "Juiz Virtual — Empresarial",
    area: "Empresarial",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Empresarial. Analiso sociedades, falências, recuperação judicial e contratos societários.",
    goal: "Analisar relações empresariais, fundamente com Código Civil (parte empresarial), Lei 6.404/76 e Lei 11.101/05.",
    instructions: "Foque em: sociedades limitadas, S.A., contrato social, dissolução, falência, recuperação judicial, governança corporativa. Cite artigos do CC e Leis especiais sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-consumidor",
    name: "Juiz Virtual — Consumidor",
    area: "Consumidor",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito do Consumidor. Analiso reclamações, vícios, inversão de ônus da prova e cláusulas abusivas.",
    goal: "Analisar relações de consumo, fundamente com CDC, Lei 8.078/90 e jurisprudência do STJ.",
    instructions: "Foque em: direitos básicos do consumidor, vício do produto/serviço, fato do produto, inversão do ônus da prova, cláusulas abusivas, publicidade enganosa. Cite artigos do CDC sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-ambiental",
    name: "Juiz Virtual — Ambiental",
    area: "Ambiental",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Ambiental. Analiso licenciamento, multas ambientais, crimes ambientais e responsabilidade civil.",
    goal: "Analisar questões ambientais, fundamente com Lei 6.938/81, Lei 9.605/98 e Código Florestal.",
    instructions: "Foque em: licenciamento ambiental, responsabilidade objetiva, passivo ambiental, APP, reserva legal, crimes ambientais. Cite artigos da Lei 6.938/81 e Lei 9.605/98 sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-eleitoral",
    name: "Juiz Virtual — Eleitoral",
    area: "Eleitoral",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Eleitoral. Analiso candidaturas, propaganda, captação ilícita e inelegibilidade.",
    goal: "Analisar questões eleitorais, fundamente com Código Eleitoral, Lei 9.504/97 e resoluções TSE.",
    instructions: "Foque em: alistamento, inelegibilidade, propaganda eleitoral, captação ilícita, Ficha Limpa, ação de impugnação de mandato. Cite artigos do Código Eleitoral e Lei 9.504/97 sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-internacional",
    name: "Juiz Virtual — Internacional",
    area: "Internacional",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Internacional. Analiso tratados, extradição, imunidade diplomática e cooperação judicial.",
    goal: "Analisar questões internacionais, fundamente com tratados ratificados, CF e direito internacional público.",
    instructions: "Foque em: jurisdição internacional, extradição, imunidade diplomática, cooperação judicial, direitos humanos, homologação de sentenças estrangeiras. Cite tratados e artigos da CF sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent-sucessoes",
    name: "Juiz Virtual — Sucessões",
    area: "Sucessões",
    tone: "Formal",
    model: MODELS[0].id,
    greeting: "Olá, sou o Juiz Virtual especializado em Direito Sucessório. Analiso inventários, testamentos, partilha de bens e direitos hereditários.",
    goal: "Analisar questões sucessórias, fundamente com Código Civil (arts. 1.784-2.027), Lei 6.015/73 e Lei 11.441/2007.",
    instructions: "Foque em: inventário judicial/extrajudicial, herdeiros necessários, legítima e disponível, colação, meação, testamento, ITCMD, partilha de bens. Cite artigos do Código Civil sempre que possível.",
    avatar: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

const SEED_AGENTS = [DEFAULT_AGENT, ...SPECIALIZED_AGENTS];

const readAgents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      // Check if specialized agents are present; if not, merge them in
      const existingIds = new Set(parsed.map(a => a.id));
      const missingSpecialized = SEED_AGENTS.filter(a => !existingIds.has(a.id));
      if (missingSpecialized.length > 0) {
        const next = [...parsed, ...missingSpecialized];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      }
      return parsed;
    }
    // No agents saved at all — seed with all specialized agents
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_AGENTS)); } catch {}
    return SEED_AGENTS;
  } catch {
    return SEED_AGENTS;
  }
};
const writeAgents = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [activeTab, setActiveTab] = useState("agents");
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
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="overline text-gold-600">Inteligência</div>
          <h1 className="font-serif text-2xl sm:text-3xl text-nude-900 mt-1 flex items-center gap-2">
            <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-gold-600" /> Agentes de IA
          </h1>
          <p className="text-sm text-nude-500 mt-1">
            Gerencie juízes virtuais e advogados especializados.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-nude-100 rounded-md p-0.5 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("agents")}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === "agents" ? "bg-white text-nude-900 shadow-sm" : "text-nude-500 hover:text-nude-700"
          }`}
        >
          <Bot className="w-4 h-4 mr-1.5 inline" />
          Juízes Virtuais
        </button>
        <button
          onClick={() => setActiveTab("lawyers")}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === "lawyers" ? "bg-white text-nude-900 shadow-sm" : "text-nude-500 hover:text-nude-700"
          }`}
        >
          <User className="w-4 h-4 mr-1.5 inline" />
          Advogados
        </button>
      </div>

      {activeTab === "agents" ? (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={startNew} className="bg-gold-600 hover:bg-gold-700 text-white gap-1.5">
              <Plus className="w-4 h-4" /> Novo agente
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LIST */}
        <Card className="lg:col-span-4 border-nude-200 overflow-hidden order-2 lg:order-1">
          <div className="p-4 border-b border-nude-200">
            <div className="text-xs uppercase tracking-widest text-nude-500 font-semibold">
              Meus agentes
            </div>
            <div className="text-xs text-nude-400 mt-1">{agents.length} configurado(s)</div>
          </div>
          <ScrollArea className="h-[40vh] sm:h-[50vh] lg:h-[560px]">
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
                        <AreaAvatar area={a.area} size="sm" name={a.name} />
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
        <Card className="lg:col-span-8 border-nude-200 order-1 lg:order-2">
          <div className="p-5 border-b border-nude-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="overline text-gold-600">Configuração</div>
              <h2 className="font-serif text-xl text-nude-900 mt-1">
                {selected ? "Editar agente" : "Novo agente"}
              </h2>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyPrompt} className="gap-1.5">
                <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Copiar prompt</span><span className="sm:hidden">Copiar</span>
              </Button>
              <Button onClick={saveDraft} className="bg-gold-600 hover:bg-gold-700 text-white gap-1.5">
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              {draft.avatar ? (
                <img src={draft.avatar} alt="Avatar do agente" className="w-14 h-14 rounded-full object-cover border border-nude-200 shrink-0" />
              ) : (
                <AreaAvatar area={draft.area} size="lg" name={draft.name} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold">Imagem do agente</div>
                <div className="flex gap-2 mt-1.5">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { onAvatarPick(e.target.files?.[0]); e.target.value = ""; }}
                  />
                  <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-[11px]" onClick={() => avatarInputRef.current?.click()}>
                    <Upload className="w-3 h-3" /> {draft.avatar ? "Trocar" : "Enviar"}
                  </Button>
                  {draft.avatar && (
                    <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-[11px] text-rose-600 hover:bg-rose-50" onClick={() => setDraft({ ...draft, avatar: "" })}>
                      <X className="w-3 h-3" /> Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold">Nome</label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Ex.: Juiz — Penal"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold">Área</label>
                <select
                  value={draft.area}
                  onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                  className="mt-1 w-full h-9 px-2 rounded-md border border-nude-200 bg-white text-xs"
                >
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold">Tom</label>
                <select
                  value={draft.tone}
                  onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
                  className="mt-1 w-full h-9 px-2 rounded-md border border-nude-200 bg-white text-xs"
                >
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold">Modelo</label>
                <select
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  className="mt-1 w-full h-9 px-2 rounded-md border border-nude-200 bg-white text-xs"
                >
                  {[...new Set(MODELS.map(m => m.group))].map(group => (
                    <optgroup key={group} label={group}>
                      {MODELS.filter(m => m.group === group).map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold">Mensagem de apresentação</label>
              <Input
                value={draft.greeting}
                onChange={(e) => setDraft({ ...draft, greeting: e.target.value })}
                className="mt-1 h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold">Objetivo do agente</label>
              <Textarea
                value={draft.goal}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
                rows={2}
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold">
                Instruções específicas (opcional)
              </label>
              <Textarea
                value={draft.instructions}
                onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                rows={4}
                placeholder="Ex.: Sempre solicitar TRCT e holerites..."
                className="mt-1 text-sm"
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
                  <div className="text-[10px] uppercase tracking-widest text-nude-500 font-semibold mb-2">
                    Prévia do prompt
                  </div>
                  <pre className="text-[11px] text-nude-700 bg-nude-50 border border-nude-200 rounded-md p-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">
                    {buildSystemPrompt(draft)}
                  </pre>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : (
        /* Lawyers Tab */
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LAWYERS.map((lawyer) => {
              const c = LAWYER_COLORS[lawyer.color] || LAWYER_COLORS.blue;
              return (
                <Card key={lawyer.id} className="border-nude-200 overflow-hidden transition-all hover:shadow-md hover:border-gold-300">
                  <div className={`${c.bg} px-4 py-3 border-b ${c.border}`}>
                    <div className="flex items-center gap-3">
                      <AreaAvatar area={lawyer.area} size="lg" name={lawyer.name} className="border-2 border-white shadow-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-nude-900 text-sm truncate">{lawyer.name}</div>
                        <div className="text-[11px] text-nude-500 mt-0.5 font-mono">{lawyer.oab}</div>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
                        {lawyer.area}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-nude-700 mb-1">{lawyer.specialty}</div>
                      <div className="text-[11px] text-nude-500 leading-relaxed">{lawyer.bio}</div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-nude-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-nude-400" />
                        {lawyer.experience}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-nude-400" />
                        {lawyer.cases}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {lawyer.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] text-nude-600">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
