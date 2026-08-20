import { useState, useRef, useCallback } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Progress } from "@/kenia/components/ui/progress";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import {
  Upload, Loader2, BarChart3, Download, Eye, TrendingUp,
  TrendingDown, Minus, Target, MousePointerClick, Users, AlertCircle, CheckCircle2,
  Plus, Trash2, FileSpreadsheet, FormInput, Copy
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";
import { api } from "@/kenia/lib/api";

const CLASS_COLORS = { Alto: "#10B981", Medio: "#F59E0B", Baixo: "#EF4444" };
const CLASS_ICONS = { Alto: TrendingUp, Medio: Minus, Baixo: TrendingDown };

const EMPTY_ROW = {
  hour: "12", site_id: "", app_id: "", device_model: "", banner_position: "0",
  C1: "1001", C2: "1002", C3: "1005", C4: "1007", C5: "1349",
  C6: "1666", C7: "1667", C8: "1889", C9: "2166", C10: "2261",
  C11: "2456", C12: "1567", C13: "1570", C14: "1894", C15: "2034",
  C16: "2227", C17: "2397", C18: "2506", C19: "2531", C20: "2632", C21: "1",
};

const PRESETS = [
  { name: "Mobile Brasil", values: { ...EMPTY_ROW, device_model: "1370", C1: "1002", C5: "1350", C14: "1901", C17: "2401" } },
  { name: "Desktop EUA", values: { ...EMPTY_ROW, device_model: "1", C1: "1001", C5: "1349", C14: "1894", C17: "2397" } },
  { name: "Tablet", values: { ...EMPTY_ROW, device_model: "2519", C1: "1005", C5: "1601", C14: "2034", C17: "2521" } },
];

export default function CTRPredictor() {
  const [step, setStep] = useState("upload"); // upload | preview | processing | results
  const [inputMode, setInputMode] = useState("form"); // form | csv
  const [jobId, setJobId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [training, setTraining] = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState("");
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const fileRef = useRef(null);

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Apenas arquivos CSV são aceitos");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 10MB)");
      return;
    }

    setStep("processing");
    setMessage("Enviando arquivo...");
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${api}/ctr/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro no upload");

      setJobId(data.job_id);
      setPreview(data.preview);
      setStep("preview");
      setProgress(100);
      toast.success(`CSV carregado: ${data.preview.rows} linhas`);
    } catch (err) {
      toast.error(err.message);
      setStep("upload");
    }
  }, []);

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const duplicateRow = (i) => setRows((prev) => { const copy = [...prev]; copy.splice(i + 1, 0, { ...prev[i] }); return copy; });
  const applyPreset = (preset) => setRows((prev) => prev.map((r, i) => i === 0 ? { ...preset.values } : r));

  const submitForm = useCallback(async () => {
    if (rows.length === 0) { toast.error("Adicione pelo menos 1 linha"); return; }
    setStep("processing");
    setMessage("Enviando dados do formulário...");
    setProgress(10);
    try {
      const res = await fetch(`${api}/ctr/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao processar formulário");
      setJobId(data.job_id);
      setPreview(data.preview);
      setStep("preview");
      setProgress(100);
      toast.success(`${rows.length} linha(s) carregada(s)`);
    } catch (err) {
      toast.error(err.message);
      setStep("upload");
    }
  }, [rows]);

  const handleTrain = useCallback(async () => {
    if (!jobId) return;
    setTraining(true);
    setStep("processing");
    setMessage("Iniciando treinamento do modelo...");
    setProgress(20);

    try {
      // Poll progress
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`${api}/ctr/results/${jobId}`);
          const data = await res.json();
          if (data.status === "completed") {
            clearInterval(poll);
            setResults(data.results);
            setProgress(100);
            setMessage("Análise concluída!");
            setStep("results");
            setTraining(false);
            toast.success("Previsões geradas com sucesso!");
          } else if (data.status === "error") {
            clearInterval(poll);
            toast.error(data.message || "Erro no treino");
            setStep("preview");
            setTraining(false);
          } else {
            setProgress(data.progress || 50);
            setMessage(data.message || "Processando...");
          }
        } catch {}
      }, 2000);

      // Start training
      const res = await fetch(`${api}/ctr/train/${jobId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        clearInterval(poll);
        throw new Error(data.detail || "Erro no treino");
      }

      if (data.results) {
        setResults(data.results);
        setProgress(100);
        setStep("results");
        toast.success("Previsões geradas com sucesso!");
      }
    } catch (err) {
      toast.error(err.message);
      setStep("preview");
    } finally {
      setTraining(false);
    }
  }, [jobId]);

  const handleExport = useCallback(() => {
    if (!jobId) return;
    window.open(`${api}/ctr/export/${jobId}`, "_blank");
    toast.success("Download iniciado");
  }, [jobId]);

  const resetAll = () => {
    setStep("upload");
    setJobId(null);
    setPreview(null);
    setResults(null);
    setProgress(0);
    setMessage("");
    setRows([{ ...EMPTY_ROW }]);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Table sorting
  const tableData = results?.table_data || [];
  const filteredData = filter
    ? tableData.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(filter.toLowerCase())))
    : tableData;
  const sortedData = sortCol
    ? [...filteredData].sort((a, b) => {
        const va = a[sortCol], vb = b[sortCol];
        const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortAsc ? cmp : -cmp;
      })
    : filteredData;

  const toggleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-nude-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">CTR Predictor</div>
            <h1 className="font-display font-bold text-2xl">Previsão de Click-Through Rate</h1>
            <p className="text-xs text-nude-500 mt-1">
              Modelo baseado no avazu-ctr · LightGBM · Feature engineering com hash encoding
            </p>
          </div>
          <div className="flex gap-2">
            {step === "results" && (
              <>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-3 h-3 mr-1" /> Exportar CSV
                </Button>
                <Button variant="outline" size="sm" onClick={resetAll}>
                  Novo Upload
                </Button>
              </>
            )}
            {step === "preview" && (
              <Button variant="outline" size="sm" onClick={resetAll}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Step: Upload */}
        {step === "upload" && (
          <div className="max-w-4xl mx-auto">
            <Tabs value={inputMode} onValueChange={setInputMode}>
              <TabsList className="mb-4">
                <TabsTrigger value="form"><FormInput className="w-3 h-3 mr-1" /> Formulário</TabsTrigger>
                <TabsTrigger value="csv"><FileSpreadsheet className="w-3 h-3 mr-1" /> Planilha CSV</TabsTrigger>
              </TabsList>

              {/* Form Mode */}
              <TabsContent value="form">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg">Entrada Manual de Dados</h3>
                      <p className="text-xs text-nude-500">Preencha os campos e clique em "Analisar CTR"</p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="text-xs border border-nude-200 rounded px-2 py-1"
                        onChange={(e) => { if (e.target.value) applyPreset(PRESETS[+e.target.value]); e.target.value = ""; }}
                        defaultValue=""
                      >
                        <option value="" disabled>Presets...</option>
                        {PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
                      </select>
                      <Button variant="outline" size="sm" onClick={addRow}>
                        <Plus className="w-3 h-3 mr-1" /> Adicionar Linha
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[50vh]">
                    {rows.map((row, idx) => (
                      <div key={idx} className="border border-nude-200 rounded-lg p-3 mb-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-nude-600">Campanha #{idx + 1}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => duplicateRow(idx)} className="h-6 px-2">
                              <Copy className="w-3 h-3" />
                            </Button>
                            {rows.length > 1 && (
                              <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} className="h-6 px-2 text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          <div>
                            <Label className="text-[10px] text-nude-500">Hora</Label>
                            <Input value={row.hour} onChange={(e) => updateRow(idx, "hour", e.target.value)} className="h-7 text-xs" placeholder="0-23" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-nude-500">Site ID</Label>
                            <Input value={row.site_id} onChange={(e) => updateRow(idx, "site_id", e.target.value)} className="h-7 text-xs" placeholder="ex: 1666" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-nude-500">App ID</Label>
                            <Input value={row.app_id} onChange={(e) => updateRow(idx, "app_id", e.target.value)} className="h-7 text-xs" placeholder="ex: 2456" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-nude-500">Device</Label>
                            <Input value={row.device_model} onChange={(e) => updateRow(idx, "device_model", e.target.value)} className="h-7 text-xs" placeholder="ex: 1370" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-nude-500">Posição</Label>
                            <Input value={row.banner_position} onChange={(e) => updateRow(idx, "banner_position", e.target.value)} className="h-7 text-xs" placeholder="0" />
                          </div>
                          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map((n) => (
                            <div key={n}>
                              <Label className="text-[10px] text-nude-500">C{n}</Label>
                              <Input
                                value={row[`C${n}`] || ""}
                                onChange={(e) => updateRow(idx, `C${n}`, e.target.value)}
                                className="h-7 text-xs"
                                placeholder={`C${n}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-nude-200">
                    <span className="text-xs text-nude-500">{rows.length} linha(s) · Clique em "Analisar CTR" para processar</span>
                    <Button onClick={submitForm} className="bg-gold-600 hover:bg-gold-700">
                      <BarChart3 className="w-4 h-4 mr-2" /> Analisar CTR
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              {/* CSV Mode */}
              <TabsContent value="csv">
                <Card className="p-8 text-center border-2 border-dashed border-nude-300 hover:border-gold-400 transition-colors">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-nude-400" />
                  <h3 className="font-display font-bold text-lg mb-2">Carregar planilha CSV</h3>
                  <p className="text-sm text-nude-500 mb-4">
                    Faça upload de um CSV com dados de impressões/anúncios
                  </p>
                  <p className="text-xs text-nude-400 mb-4">
                    Colunas: click (target), hour, site_id, app_id, device_model, banner_position, C1-C21
                  </p>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleUpload}
                    className="max-w-xs mx-auto"
                  />
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-nude-400">
                    <span><Target className="w-3 h-3 inline mr-1" /> Auto-detecta colunas</span>
                    <span><BarChart3 className="w-3 h-3 inline mr-1" /> Gráficos automáticos</span>
                    <span><Download className="w-3 h-3 inline mr-1" /> Exporta CSV</span>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-gold-500 animate-spin" />
              <h3 className="font-display font-bold text-lg mb-2">Processando...</h3>
              <p className="text-sm text-nude-500 mb-4">{message}</p>
              <Progress value={progress} className="w-full max-w-md mx-auto" />
              <p className="text-xs text-nude-400 mt-2">{progress}%</p>
            </Card>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && preview && (
          <div className="max-w-5xl mx-auto">
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg">Dados carregados</h3>
                  <p className="text-sm text-nude-500">
                    {preview.rows.toLocaleString()} linhas · {preview.columns.length} colunas
                  </p>
                </div>
                {preview.click_column && (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Coluna de clique: {preview.click_column}
                  </Badge>
                )}
                {!preview.click_column && (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    <AlertCircle className="w-3 h-3 mr-1" /> Sem coluna de clique — dados sintéticos serão gerados
                  </Badge>
                )}
              </div>

              {/* Column list */}
              <div className="mb-4">
                <Label className="text-xs text-nude-500">Colunas detectadas:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {preview.columns.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">
                      {c} <span className="text-nude-400 ml-1">({preview.dtypes[c]})</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-nude-200">
                      {preview.columns.slice(0, 8).map((c) => (
                        <th key={c} className="text-left py-2 px-2 font-medium text-nude-600">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-nude-100">
                        {preview.columns.slice(0, 8).map((c) => (
                          <td key={c} className="py-1 px-2 text-nude-700 max-w-[120px] truncate">
                            {String(row[c] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="text-center">
              <Button onClick={handleTrain} disabled={training} className="bg-gold-600 hover:bg-gold-700">
                {training ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                {training ? "Treinando modelo..." : "Iniciar Análise CTR"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && results && (
          <div className="max-w-7xl mx-auto">
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="charts">Gráficos</TabsTrigger>
                <TabsTrigger value="table">Tabela de Previsões</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <StatCard label="CTR Médio" value={`${(results.avg_ctr * 100).toFixed(2)}%`} color="text-gold-600" />
                  <StatCard label="Impressões" value={results.total_impressions?.toLocaleString()} color="text-nude-700" />
                  <StatCard label="Cliques Est." value={results.estimated_clicks?.toLocaleString()} color="text-blue-600" />
                  <StatCard label="Alto CTR" value={results.stats?.high_ctr?.toLocaleString()} color="text-green-600" icon={TrendingUp} />
                  <StatCard label="Médio CTR" value={results.stats?.medium_ctr?.toLocaleString()} color="text-yellow-600" icon={Minus} />
                  <StatCard label="Baixo CTR" value={results.stats?.low_ctr?.toLocaleString()} color="text-red-600" icon={TrendingDown} />
                </div>

                {results.auc > 0 && (
                  <Card className="p-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-nude-500">AUC do Modelo</p>
                        <p className="text-2xl font-bold text-gold-600">{results.auc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-nude-500">Features utilizadas</p>
                        <p className="text-2xl font-bold text-nude-700">{results.features}</p>
                      </div>
                      <div>
                        <p className="text-xs text-nude-500">Amostras de treino</p>
                        <p className="text-2xl font-bold text-nude-700">{results.train_size?.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Feature importance */}
                {results.feature_importance && (
                  <Card className="p-4">
                    <h4 className="font-display font-bold text-sm mb-3">Top Features por Importância</h4>
                    <div className="space-y-1">
                      {Object.entries(results.feature_importance)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([name, imp]) => (
                          <div key={name} className="flex items-center gap-2">
                            <span className="text-xs text-nude-600 w-40 truncate">{name}</span>
                            <div className="flex-1 bg-nude-100 rounded-full h-2">
                              <div
                                className="bg-gold-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, (imp / Math.max(...Object.values(results.feature_importance))) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-nude-400 w-16 text-right">{imp.toFixed(1)}</span>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Charts */}
              <TabsContent value="charts">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Distribution */}
                  {results.distribution && (
                    <Card className="p-4">
                      <h4 className="font-display font-bold text-sm mb-3">Distribuição de Probabilidades</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={results.distribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#D4A853" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* Classification pie */}
                  <Card className="p-4">
                    <h4 className="font-display font-bold text-sm mb-3">Classificação de Potencial</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Alto", value: results.stats?.high_ctr || 0, color: CLASS_COLORS.Alto },
                            { name: "Médio", value: results.stats?.medium_ctr || 0, color: CLASS_COLORS.Medio },
                            { name: "Baixo", value: results.stats?.low_ctr || 0, color: CLASS_COLORS.Baixo },
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: "Alto", color: CLASS_COLORS.Alto },
                            { name: "Médio", color: CLASS_COLORS.Medio },
                            { name: "Baixo", color: CLASS_COLORS.Baixo },
                          ].map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  {/* Breakdowns */}
                  {results.breakdowns && Object.entries(results.breakdowns).slice(0, 4).map(([col, data]) => (
                    <Card key={col} className="p-4">
                      <h4 className="font-display font-bold text-sm mb-3">CTR por {col}</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="ctr" fill="#D4A853" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Table */}
              <TabsContent value="table">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Input
                      placeholder="Filtrar..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="max-w-xs"
                    />
                    <span className="text-xs text-nude-500">{sortedData.length} registros</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-nude-200">
                          {sortedData.length > 0 && Object.keys(sortedData[0]).map((col) => (
                            <th
                              key={col}
                              className="text-left py-2 px-2 font-medium text-nude-600 cursor-pointer hover:text-gold-600"
                              onClick={() => toggleSort(col)}
                            >
                              {col} {sortCol === col ? (sortAsc ? "▲" : "▼") : ""}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedData.map((row, i) => (
                          <tr key={i} className="border-b border-nude-100 hover:bg-nude-50">
                            {Object.entries(row).map(([col, val]) => (
                              <td key={col} className="py-1.5 px-2">
                                {col === "classification" ? (
                                  <Badge
                                    className={`text-[10px] ${val === "Alto" ? "bg-green-100 text-green-700" :
                                      val === "Medio" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-red-100 text-red-700"}`}
                                  >
                                    {val}
                                  </Badge>
                                ) : col === "ctr_probability" ? (
                                  <span className="font-mono">{(val * 100).toFixed(2)}%</span>
                                ) : col === "ctr_estimated" ? (
                                  <span className="font-mono">{val}%</span>
                                ) : (
                                  <span className="max-w-[100px] truncate block">{String(val ?? "")}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-nude-700", icon: Icon }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
        <span className="text-[10px] text-nude-500 uppercase">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value ?? "—"}</p>
    </Card>
  );
}
