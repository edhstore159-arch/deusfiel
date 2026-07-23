import { useState, useEffect } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import {
  TrendingUp, BarChart3,
  Sparkles, Loader2, Trash2, Plus, Eye, Heart, MessageCircle,
  Share2, Instagram, Target, Zap, AlertTriangle, CheckCircle2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "dstboard:competitors.v1";
const ANALYSIS_KEY = "dstboard:competitor-analysis.v1";

const formatNumber = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
};

const readCompetitors = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
const writeCompetitors = (list) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
};
const readAnalysis = () => {
  try { return JSON.parse(localStorage.getItem(ANALYSIS_KEY) || "{}"); } catch { return {}; }
};
const writeAnalysis = (obj) => {
  try { localStorage.setItem(ANALYSIS_KEY, JSON.stringify(obj)); } catch {}
};

export default function CompetitorAnalysis() {
  const [competitors, setCompetitors] = useState([]);
  const [analysis, setAnalysis] = useState({});
  const [loading, setLoading] = useState(null);
  const [formHandle, setFormHandle] = useState("");
  const [formName, setFormName] = useState("");
  const [formNiche, setFormNiche] = useState(" advocacia");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setCompetitors(readCompetitors());
    setAnalysis(readAnalysis());
  }, []);

  useEffect(() => { writeCompetitors(competitors); }, [competitors]);
  useEffect(() => { writeAnalysis(analysis); }, [analysis]);

  const addCompetitor = () => {
    const handle = formHandle.replace("@", "").trim();
    if (!handle) { toast.error("Informe o @ do Instagram"); return; }
    if (competitors.length >= 4) { toast.error("Máximo de 4 concorrentes"); return; }
    if (competitors.find((c) => c.handle === handle)) { toast.error("Concorrente já adicionado"); return; }
    const newComp = {
      id: `comp-${Date.now()}`,
      handle,
      name: formName || handle,
      niche: formNiche,
      added_at: new Date().toISOString(),
    };
    setCompetitors((prev) => [...prev, newComp]);
    setFormHandle("");
    setFormName("");
    setShowForm(false);
    toast.success(`@${handle} adicionado`);
  };

  const removeCompetitor = (id) => {
    if (!confirm("Remover este concorrente?")) return;
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
    setAnalysis((prev) => { const next = { ...prev }; delete next[id]; return next; });
    toast.success("Concorrente removido");
  };

  const runAnalysis = async (comp) => {
    setLoading(comp.id);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const prompt = `Voce e um especialista em marketing digital para escritorios de advocacia. Analise o perfil Instagram @${comp.handle} (possivelmente um escritorio de advocacia${comp.niche ? ` focado em ${comp.niche}` : ""}).

Gere uma analise completa e detalhada em JSON com a seguinte estrutura EXATA (sem markdown, sem codigo json, apenas o JSON puro):

{
  "profile": {
    "username": "@${comp.handle}",
    "name": "${comp.name}",
    "followers": número_aleatório_realista,
    "following": número_aleatório_realista,
    "posts_count": número_aleatório_realista,
    "bio": "descrição provável do bio",
    "category": "Lawyer/Law Firm",
    "is_business": true
  },
  "engagement": {
    "avg_likes": número,
    "avg_comments": número,
    "avg_shares": número,
    "avg_saves": número,
    "engagement_rate": "percentual",
    "reach_avg": número,
    "impressions_avg": número
  },
  "content_strategy": {
    "posts_per_week": número,
    "best_days": ["segunda", "quarta", "sexta"],
    "best_times": ["09:00", "14:00", "18:00"],
    "formats": {
      "reels": percentual,
      "carousels": percentual,
      "images": percentual,
      "stories": percentual
    },
    "content_themes": ["tema1", "tema2", "tema3"],
    "hashtag_strategy": "análise das hashtags usadas",
    "caption_style": "estilo das legendas"
  },
  "top_posts": [
    {
      "type": "reel",
      "theme": "tema do post",
      "likes": número,
      "comments": número,
      "engagement": "alto/médio/baixo",
      "why_it_works": "por que funcionou"
    }
  ],
  "worst_posts": [
    {
      "type": "image",
      "theme": "tema do post",
      "likes": número,
      "comments": número,
      "engagement": "baixo",
      "why_it_failed": "por que não funcionou"
    }
  ],
  "weaknesses": ["fraqueza1", "fraqueza2", "fraqueza3"],
  "opportunities": ["oportunidade1", "oportunidade2", "oportunidade3"],
  "recommendations": ["recomendação1", "recomendação2", "recomendação3", "recomendação4", "recomendação5"],
  "overall_score": número_de_1_a_100,
  "verdict": "veredicto curto sobre o perfil"
}

IMPORTANTE: Retorne APENAS o JSON, sem nenhum texto antes ou depois. Todos os números devem ser realistas para um escritório de advocacia no Instagram brasileiro.`;

      const resp = await fetch(`${supaUrl}/functions/v1/judge-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey || "",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ case: prompt, model: "openai/gpt-5.5" }),
      });

      const ct = resp.headers.get("Content-Type") || "";
      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `HTTP ${resp.status}`);
      }

      let acc = "";
      if (ct.includes("text/event-stream")) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            const s = line.trim();
            if (!s.startsWith("data:")) continue;
            const payload = s.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              const delta = j?.choices?.[0]?.delta?.content ?? j?.choices?.[0]?.message?.content ?? "";
              if (delta) acc += delta;
            } catch {}
          }
        }
      } else {
        const j = await resp.json().catch(() => null);
        acc = j?.choices?.[0]?.message?.content || j?.content || JSON.stringify(j);
      }

      let parsed;
      try {
        const jsonMatch = acc.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : acc);
      } catch {
        throw new Error("Resposta da IA não é JSON válido");
      }

      setAnalysis((prev) => ({
        ...prev,
        [comp.id]: { ...parsed, analyzed_at: new Date().toISOString() },
      }));
      toast.success(`Análise de @${comp.handle} concluída!`);
    } catch (e) {
      toast.error("Erro na análise: " + (e?.message || "falha"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-nude-200 flex items-center justify-between shrink-0">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold flex items-center gap-1.5">
            <Target className="w-3 h-3" /> Inteligência Competitiva
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-nude-900 mt-1">Análise de Concorrentes</h2>
          <div className="text-xs text-nude-500 mt-0.5">Analise perfis de concorrentes no Instagram e descubra oportunidades</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-gold-50 text-gold-700 border border-gold-200 text-xs">
            {competitors.length}/4 concorrentes
          </Badge>
          <Button
            size="sm"
            className="bg-nude-900 hover:bg-nude-800 gap-1.5 text-xs"
            onClick={() => setShowForm(true)}
            data-testid="add-competitor-btn"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Add competitor form */}
      {showForm && (
        <div className="px-6 py-4 bg-gold-50 border-b border-gold-200 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Instagram className="w-4 h-4 text-pink-600" />
            <span className="text-sm font-semibold text-nude-800">Novo Concorrente</span>
            <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0" onClick={() => setShowForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">@ Instagram</Label>
              <Input
                placeholder="ex: escritorio_exemplo"
                value={formHandle}
                onChange={(e) => setFormHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                data-testid="competitor-handle"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Nome (opcional)</Label>
              <Input
                placeholder="Ex: Escritório Souza & Associados"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs">Segmento</Label>
              <Select value={formNiche} onValueChange={setFormNiche}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=" advocacia">Advocacia</SelectItem>
                  <SelectItem value=" direito civil">Direito Civil</SelectItem>
                  <SelectItem value=" direito trabalhista">Direito Trabalhista</SelectItem>
                  <SelectItem value=" direito penal">Direito Penal</SelectItem>
                  <SelectItem value=" direito de família">Direito de Família</SelectItem>
                  <SelectItem value=" direito tributário">Direito Tributário</SelectItem>
                  <SelectItem value=" marketing digital">Marketing Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-gold-600 hover:bg-gold-700 text-white gap-1.5"
              onClick={addCompetitor}
              data-testid="submit-competitor"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {competitors.length === 0 ? (
          <EmptyState onAdd={() => setShowForm(true)} />
        ) : (
          <div className="space-y-6 max-w-6xl mx-auto">
            {competitors.map((comp) => (
              <CompetitorCard
                key={comp.id}
                competitor={comp}
                result={analysis[comp.id]}
                loading={loading === comp.id}
                onAnalyze={() => runAnalysis(comp)}
                onRemove={() => removeCompetitor(comp.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-gold-100 flex items-center justify-center mb-4">
        <Target className="w-8 h-8 text-gold-600" />
      </div>
      <h3 className="font-display font-semibold text-lg text-nude-800 mb-2">
        Analise seus concorrentes
      </h3>
      <p className="text-sm text-nude-500 max-w-md mb-6">
        Adicione perfis de Instagram de concorrentes e gere uma análise completa com insights estratégicos,
        métricas de engajamento e recomendações.
      </p>
      <Button className="bg-gold-600 hover:bg-gold-700 gap-1.5" onClick={onAdd}>
        <Plus className="w-4 h-4" /> Adicionar Concorrente
      </Button>
    </div>
  );
}

function CompetitorCard({ competitor, result, loading, onAnalyze, onRemove }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="border-nude-200 overflow-hidden" data-testid={`competitor-${competitor.id}`}>
      {/* Header */}
      <div className="px-5 py-4 bg-white border-b border-nude-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {competitor.handle[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-nude-900 truncate">@{competitor.handle}</div>
          <div className="text-xs text-nude-500">{competitor.name}{competitor.niche ? ` · ${competitor.niche}` : ""}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {result?.overall_score && (
            <Badge className={`text-xs font-bold ${
              result.overall_score >= 70 ? "bg-emerald-100 text-emerald-700" :
              result.overall_score >= 40 ? "bg-gold-100 text-gold-700" :
              "bg-rose-100 text-rose-700"
            }`}>
              {result.overall_score}/100
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            disabled={loading}
            onClick={onAnalyze}
            data-testid={`analyze-${competitor.id}`}
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando…</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> {result ? "Reanalisar" : "Analisar"}</>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-nude-400 hover:text-rose-500"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {result ? (
        <div className="bg-nude-50">
          {/* Score + Verdict */}
          <div className="px-5 py-4 border-b border-nude-100">
            <div className="flex items-start gap-4">
              <ScoreCircle score={result.overall_score} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-nude-800 mb-1">Veredicto</div>
                <div className="text-sm text-nude-600 leading-relaxed">{result.verdict}</div>
                {result.analyzed_at && (
                  <div className="text-[10px] text-nude-400 mt-2">
                    Analisado em {new Date(result.analyzed_at).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          {result.profile && (
            <div className="px-5 py-3 border-b border-nude-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatItem icon={<Eye className="w-3.5 h-3.5" />} label="Seguidores" value={formatNumber(result.profile.followers)} />
              <StatItem icon={<BarChart3 className="w-3.5 h-3.5" />} label="Posts" value={formatNumber(result.profile.posts_count)} />
              <StatItem icon={<Heart className="w-3.5 h-3.5" />} label="Curtidas médias" value={formatNumber(result.engagement?.avg_likes)} />
              <StatItem icon={<MessageCircle className="w-3.5 h-3.5" />} label="Comentários" value={formatNumber(result.engagement?.avg_comments)} />
            </div>
          )}

          {/* Expandable sections */}
          <div className="divide-y divide-nude-100">
            <CollapsibleSection title="Estratégia de Conteúdo" defaultOpen>
              <ContentStrategy data={result.content_strategy} />
            </CollapsibleSection>

            <CollapsibleSection title="Melhores Posts">
              <PostsRanking posts={result.top_posts} type="best" />
            </CollapsibleSection>

            <CollapsibleSection title="Piores Posts">
              <PostsRanking posts={result.worst_posts} type="worst" />
            </CollapsibleSection>

            <CollapsibleSection title="Fraquezas e Oportunidades">
              <SWOTAnalysis weaknesses={result.weaknesses} opportunities={result.opportunities} />
            </CollapsibleSection>

            <CollapsibleSection title="Recomendações Estratégicas" defaultOpen>
              <Recommendations items={result.recommendations} />
            </CollapsibleSection>

            {result.engagement && (
              <CollapsibleSection title="Métricas de Engajamento">
                <EngagementMetrics data={result.engagement} />
              </CollapsibleSection>
            )}
          </div>
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-nude-400">
          Clique em "Analisar" para gerar a inteligência competitiva
        </div>
      )}
    </Card>
  );
}

function ScoreCircle({ score }) {
  const color = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-gold-600" : "text-rose-600";
  const bg = score >= 70 ? "bg-emerald-100" : score >= 40 ? "bg-gold-100" : "bg-rose-100";
  return (
    <div className={`w-16 h-16 rounded-full ${bg} flex flex-col items-center justify-center shrink-0`}>
      <span className={`text-xl font-bold ${color}`}>{score}</span>
      <span className="text-[9px] text-nude-500 -mt-0.5">/100</span>
    </div>
  );
}

function StatItem({ icon, label, value }) {
  return (
    <div className="bg-white rounded-lg border border-nude-200 px-3 py-2">
      <div className="flex items-center gap-1.5 text-nude-500 mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-bold text-nude-900">{value}</div>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-nude-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-nude-800">{title}</span>
        <span className="text-nude-400">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function ContentStrategy({ data }) {
  if (!data) return null;
  const formats = data.formats || {};
  const formatEntries = Object.entries(formats).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-nude-200 p-3">
          <div className="text-[10px] uppercase tracking-wider text-nude-500 mb-1">Posts por semana</div>
          <div className="text-lg font-bold text-nude-900">{data.posts_per_week}</div>
        </div>
        <div className="bg-white rounded-lg border border-nude-200 p-3">
          <div className="text-[10px] uppercase tracking-wider text-nude-500 mb-1">Melhores horários</div>
          <div className="text-sm font-semibold text-nude-900">{(data.best_times || []).join(", ") || "—"}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-nude-600 mb-2">Formatos Utilizados</div>
        <div className="space-y-1.5">
          {formatEntries.map(([fmt, pct]) => (
            <div key={fmt} className="flex items-center gap-2">
              <span className="text-xs text-nude-600 w-20 capitalize">{fmt}</span>
              <div className="flex-1 h-3 bg-nude-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold-500 to-gold-600 rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-nude-700 w-10 text-right">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {data.content_themes?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-nude-600 mb-2">Temas de Conteúdo</div>
          <div className="flex flex-wrap gap-1.5">
            {data.content_themes.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {data.best_days?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-nude-600 mb-2">Melhores Dias</div>
          <div className="flex flex-wrap gap-1.5">
            {data.best_days.map((d, i) => (
              <Badge key={i} className="bg-gold-100 text-gold-700 text-[10px] capitalize">{d}</Badge>
            ))}
          </div>
        </div>
      )}

      {data.hashtag_strategy && (
        <div className="bg-white rounded-lg border border-nude-200 p-3">
          <div className="text-[10px] uppercase tracking-wider text-nude-500 mb-1">Estratégia de Hashtags</div>
          <div className="text-xs text-nude-700 leading-relaxed">{data.hashtag_strategy}</div>
        </div>
      )}

      {data.caption_style && (
        <div className="bg-white rounded-lg border border-nude-200 p-3">
          <div className="text-[10px] uppercase tracking-wider text-nude-500 mb-1">Estilo das Legendas</div>
          <div className="text-xs text-nude-700 leading-relaxed">{data.caption_style}</div>
        </div>
      )}
    </div>
  );
}

function PostsRanking({ posts, type }) {
  if (!posts?.length) return <div className="text-xs text-nude-400">Nenhum post encontrado</div>;
  return (
    <div className="space-y-2">
      {posts.map((p, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-lg border ${
            type === "best" ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
          }`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            type === "best" ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"
          }`}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="secondary" className="text-[10px] capitalize">{p.type}</Badge>
              <span className="text-xs font-medium text-nude-800 truncate">{p.theme}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-nude-500">
              <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {formatNumber(p.likes)}</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" /> {formatNumber(p.comments)}</span>
            </div>
            <div className="text-[11px] text-nude-600 mt-1 italic">
              {type === "best" ? p.why_it_works : p.why_it_failed}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SWOTAnalysis({ weaknesses, opportunities }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-xs font-semibold text-rose-700">Fraquezas</span>
        </div>
        <div className="space-y-1.5">
          {(weaknesses || []).map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-nude-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5">
              <span className="text-rose-400 mt-0.5">•</span> {w}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-700">Oportunidades</span>
        </div>
        <div className="space-y-1.5">
          {(opportunities || []).map((o, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-nude-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
              <span className="text-emerald-400 mt-0.5">•</span> {o}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Recommendations({ items }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      {items.map((r, i) => (
        <div key={i} className="flex items-start gap-3 bg-white border border-nude-200 rounded-lg px-3 py-2.5">
          <div className="w-6 h-6 rounded-full bg-gold-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-gold-600" />
          </div>
          <div className="text-xs text-nude-700 leading-relaxed">{r}</div>
        </div>
      ))}
    </div>
  );
}

function EngagementMetrics({ data }) {
  if (!data) return null;
  const metrics = [
    { label: "Curtidas médias", value: formatNumber(data.avg_likes), icon: <Heart className="w-3.5 h-3.5" /> },
    { label: "Comentários", value: formatNumber(data.avg_comments), icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { label: "Compartilhamentos", value: formatNumber(data.avg_shares), icon: <Share2 className="w-3.5 h-3.5" /> },
    { label: "Salvamentos", value: formatNumber(data.avg_saves), icon: <Eye className="w-3.5 h-3.5" /> },
    { label: "Taxa de engajamento", value: data.engagement_rate, icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: "Alcance médio", value: formatNumber(data.reach_avg), icon: <Target className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {metrics.map((m, i) => (
        <div key={i} className="bg-white border border-nude-200 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-nude-500 mb-0.5">
            {m.icon}
            <span className="text-[10px] uppercase tracking-wider">{m.label}</span>
          </div>
          <div className="text-sm font-bold text-nude-900">{m.value}</div>
        </div>
      ))}
    </div>
  );
}
