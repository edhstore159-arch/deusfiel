import { useEffect, useState } from "react";
import { api } from "@/kenia/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Label } from "@/kenia/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/kenia/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { Plus, Phone, Mail, Trash2, Flame, Tag, RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STAGE_OVERRIDE_KEY = "crm.autoImport.stageOverrides.v1";
const HIDDEN_KEY = "crm.autoImport.hidden.v1";
const readJSON = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? f; } catch { return f; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const mapQualifToStage = (q) => {
  const s = String(q || "").toLowerCase();
  if (s === "qualificado") return "qualificado";
  if (s === "nao_qualificado" || s === "não_qualificado") return "nao_interessado";
  if (s === "necessita_mais_info") return "em_contato";
  return "novos_leads";
};


const URG_COLORS = {
  baixa: "bg-nude-100 text-nude-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-gold-100 text-gold-800",
  critica: "bg-rose-100 text-rose-700",
};

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  yellow: { bg: "bg-gold-50", text: "text-gold-800", dot: "bg-gold-500" },
  green: { bg: "bg-gold-50", text: "text-gold-700", dot: "bg-gold-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  emerald: { bg: "bg-gold-50", text: "text-gold-800", dot: "bg-gold-600" },
  red: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

const FALLBACK_STAGES = [
  { id: "novos_leads", label: "Novos Leads", color: "blue" },
  { id: "em_contato", label: "Em Contato", color: "yellow" },
  { id: "interessado", label: "Interessado", color: "green" },
  { id: "qualificado", label: "Qualificado", color: "emerald" },
  { id: "em_negociacao", label: "Em Negociação", color: "orange" },
  { id: "convertido", label: "Convertido", color: "purple" },
  { id: "nao_interessado", label: "Não Interessado", color: "red" },
];

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [autoLeads, setAutoLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", case_type: "", description: "" });

  useEffect(() => {
    api.get("/crm/stages")
      .then((r) => {
        const d = r?.data;
        const list = Array.isArray(d) ? d
          : Array.isArray(d?.stages) ? d.stages
          : Array.isArray(d?.data) ? d.data
          : Array.isArray(d?.items) ? d.items
          : [];
        setStages(list.length ? list : FALLBACK_STAGES);
      })
      .catch(() => setStages(FALLBACK_STAGES));
    load();
    autoImport();
    const t = setInterval(autoImport, 60000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const { data } = await api.get("/leads");
      setLeads(Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : []);
    } catch {
      setLeads([]);
    }
  };

  const autoImport = async (opts = {}) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from("case_analyses")
        .select("id, session_id, visitor_name, visitor_phone, area, resumo, qualificacao, acertividade, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const overrides = readJSON(STAGE_OVERRIDE_KEY, {});
      const hidden = new Set(readJSON(HIDDEN_KEY, []));
      const items = (data || [])
        .filter((r) => !hidden.has(String(r.id)))
        .map((r) => ({
          id: `case-${r.id}`,
          _auto: true,
          _caseId: String(r.id),
          name: r.visitor_name || "Cliente (auto)",
          phone: r.visitor_phone || "—",
          email: "",
          case_type: r.area || null,
          description: r.resumo || "",
          score: Number(r.acertividade || 0),
          urgency: "media",
          tags: [],
          stage: overrides[String(r.id)] || mapQualifToStage(r.qualificacao),
        }));
      setAutoLeads(items);
      if (opts.toast) toast.success(`${items.length} caso(s) sincronizado(s) no pipeline`);
    } catch (e) {
      if (opts.toast) toast.error("Falha ao sincronizar casos");
    } finally {
      setSyncing(false);
    }
  };

  const create = async () => {
    if (!form.name || !form.phone) {
      toast.error("Nome e telefone obrigatórios");
      return;
    }
    try {
      await api.post("/leads", form);
      toast.success("Lead criado");
      setOpen(false);
      setForm({ name: "", phone: "", email: "", case_type: "", description: "" });
      load();
    } catch {
      toast.error("Erro ao criar");
    }
  };

  const moveStage = async (id, stage) => {
    if (String(id).startsWith("case-")) {
      const caseId = id.slice(5);
      const overrides = readJSON(STAGE_OVERRIDE_KEY, {});
      overrides[caseId] = stage;
      writeJSON(STAGE_OVERRIDE_KEY, overrides);
      setAutoLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
      return;
    }
    await api.patch(`/leads/${id}`, { stage });
    load();
  };

  const removeLead = async (id) => {
    if (!confirm("Excluir este lead?")) return;
    if (String(id).startsWith("case-")) {
      const caseId = id.slice(5);
      const hidden = new Set(readJSON(HIDDEN_KEY, []));
      hidden.add(caseId);
      writeJSON(HIDDEN_KEY, Array.from(hidden));
      setAutoLeads((prev) => prev.filter((l) => l.id !== id));
      return;
    }
    await api.delete(`/leads/${id}`);
    load();
  };

  const allLeads = [...leads, ...autoLeads];


  return (
    <div className="h-screen flex flex-col bg-nude-50">
      <div className="px-6 py-4 bg-white border-b border-nude-200 flex items-center justify-between">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">CRM</div>
          <h1 className="font-display font-bold text-2xl">Pipeline Kanban</h1>
          <div className="text-xs text-nude-500 mt-0.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-gold-500" />
            {autoLeads.length} caso(s) auto-conectados · atualiza a cada 60s
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => autoImport({ toast: true })} disabled={syncing} data-testid="crm-sync-btn">
            <RefreshCcw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} /> Sincronizar casos
          </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-nude-900 hover:bg-nude-800" data-testid="new-lead-btn">
              <Plus className="w-4 h-4 mr-2" /> Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="lead-name" /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="lead-phone" /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="lead-email" /></div>
              <div>
                <Label>Área do Direito</Label>
                <Select value={form.case_type} onValueChange={v => setForm({ ...form, case_type: v })}>
                  <SelectTrigger data-testid="lead-case-type"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {["Família", "Trabalhista", "Previdenciário/INSS", "Bancário", "Cível", "Criminal", "Empresarial", "Tributário", "Consumidor"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="lead-desc" /></div>
            </div>
            <DialogFooter>
              <Button onClick={create} className="bg-nude-900 hover:bg-nude-800" data-testid="lead-submit">Criar Lead</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>


      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max h-full">
          {stages.map(stage => {
            const stageLeads = allLeads.filter(l => l.stage === stage.id);
            const c = COLOR_MAP[stage.color] || COLOR_MAP.blue;
            return (
              <div
                key={stage.id}
                className="w-80 shrink-0 flex flex-col rounded-md transition-all"
                data-testid={`column-${stage.id}`}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-gold-400"); }}
                onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-gold-400")}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("ring-2", "ring-gold-400");
                  const id = e.dataTransfer.getData("text/lead-id");
                  if (id) moveStage(id, stage.id);
                }}
              >
                <div className={`${c.bg} rounded-md border border-nude-200 px-3 py-2.5 flex items-center justify-between mb-2`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className={`font-display font-semibold text-sm ${c.text}`}>{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs h-5 bg-white">{stageLeads.length}</Badge>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto pb-4 pr-1">
                  {stageLeads.map(lead => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)}
                      className="p-3 border-nude-200 hover:shadow-sm hover:border-nude-300 transition-all cursor-grab active:cursor-grabbing"
                      data-testid={`lead-card-${lead.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-medium text-sm leading-tight">{lead.name}</div>
                        <Badge className="bg-nude-900 hover:bg-nude-900 text-white text-[10px] shrink-0">
                          {lead.score}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {lead.case_type && (
                          <Badge variant="outline" className="text-[10px]">{lead.case_type}</Badge>
                        )}
                        {lead.urgency && lead.urgency !== "media" && (
                          <Badge className={`${URG_COLORS[lead.urgency]} hover:${URG_COLORS[lead.urgency]} text-[10px] gap-1`}>
                            <Flame className="w-2.5 h-2.5" />
                            {lead.urgency}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-nude-500">
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {lead.phone}</div>
                        {lead.email && <div className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3" /> {lead.email}</div>}
                      </div>
                      {lead.description && <div className="text-xs text-nude-600 mt-2 line-clamp-2">{lead.description}</div>}
                      {lead.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lead.tags.slice(0, 4).map((t, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-nude-100 text-nude-600 rounded inline-flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-nude-100">
                        <Select value="" onValueChange={(v) => moveStage(lead.id, v)}>
                          <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Mover para..." /></SelectTrigger>
                          <SelectContent>
                            {stages.filter(s => s.id !== lead.stage).map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => removeLead(lead.id)} data-testid={`delete-lead-${lead.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="text-xs text-nude-400 text-center py-6 border border-dashed border-nude-200 rounded-md">Arraste leads para cá</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
