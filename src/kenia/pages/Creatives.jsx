import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { Sparkles, Instagram, Facebook, Linkedin, Trash2, Download, Copy, Wand2, Upload, X as XIcon, CalendarClock, Pencil, Film } from "lucide-react";
import { toast } from "sonner";
import CreativeAssetsLibrary from "@/kenia/components/CreativeAssetsLibrary";
import { CREATIVE_TEMPLATES } from "@/kenia/lib/creativeTemplates";

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X (Twitter)" },
  { id: "pinterest", label: "Pinterest" },
  { id: "whatsapp", label: "WhatsApp" },
];


export default function Creatives() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [refImage, setRefImage] = useState(null); // data URL
  const [logoImage, setLogoImage] = useState(() => {
    try { return localStorage.getItem("kenia.creative.logo") || null; } catch { return null; }
  }); // data URL (logo do escritório) — persistido entre sessões
  const [igAccount, setIgAccount] = useState(null); // { ig_username, page_name }
  const [igMedia, setIgMedia] = useState([]);
  const [igLoading, setIgLoading] = useState(false);

  async function refreshInstagram() {
    setIgLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-list-media", { body: {} });
      if (error) throw error;
      if (data?.connected) {
        setIgAccount(data.account || null);
        setIgMedia(data.media || []);
      } else {
        setIgAccount(null);
        setIgMedia([]);
      }
    } catch (e) {
      console.warn("ig list error", e);
    } finally {
      setIgLoading(false);
    }
  }

  useEffect(() => { refreshInstagram(); }, []);

  useEffect(() => {
    function onMsg(ev) {
      if (ev?.data?.type === "instagram-connected") {
        toast.success("Instagram conectado");
        refreshInstagram();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  async function connectInstagram() {
    try {
      const { data, error } = await supabase.functions.invoke("instagram-oauth-start", { body: {} });
      if (error) throw error;
      if (!data?.url) throw new Error("URL OAuth indisponível");
      window.open(data.url, "ig_oauth", "width=600,height=720");
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("INSTAGRAM_APP_ID")) {
        toast.error("Configure INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET nos secrets para conectar.");
      } else {
        toast.error("Falha ao iniciar conexão: " + msg);
      }
    }
  }

  async function disconnectInstagram() {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      await supabase.from("instagram_accounts").delete().eq("user_id", u.user.id);
      setIgAccount(null);
      setIgMedia([]);
      toast.success("Instagram desconectado");
    } catch (e) {
      toast.error("Falha ao desconectar: " + String(e?.message || e));
    }
  }

  async function publishToInstagram(creative) {
    try {
      if (!igAccount) {
        toast.error("Conecte o Instagram primeiro");
        return;
      }
      const imgRef = creative.image_b64 || creative.image || creative.image_url;
      if (!imgRef || !/^https?:\/\//i.test(imgRef)) {
        toast.error("Esta imagem ainda não tem URL pública. Salve-a na galeria primeiro.");
        return;
      }
      const caption = [creative.title, creative.caption, creative.hashtags].filter(Boolean).join("\n\n");
      toast.message("Publicando no Instagram…");
      const { data, error } = await supabase.functions.invoke("instagram-publish", {
        body: { image_url: imgRef, caption },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Publicado! Atualizando feed…");
      setTimeout(refreshInstagram, 2000);
    } catch (e) {
      toast.error("Falha ao publicar: " + String(e?.message || e));
    }
  }

  const [form, setForm] = useState({
    title: "", network: "instagram", format: "post",
    topic: "", tone: "profissional", case_type: "",
    caption: "", subtitle: "",
    provider: "emergent",
  });

  const [scheduled, setScheduled] = useState([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null); // creative item
  const [scheduleForm, setScheduleForm] = useState({
    caption: "",
    hashtags: "",
    scheduled_for: "",
    platforms: ["instagram"],
  });
  const [editTarget, setEditTarget] = useState(null); // creative item being edited
  const [editPrompt, setEditPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [editPreview, setEditPreview] = useState(null);
  const [editUpload, setEditUpload] = useState(null); // data URL for replacement source image

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRefImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onPickLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Logo muito grande (máx 4MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setLogoImage(url);
      try { localStorage.setItem("kenia.creative.logo", url); } catch {}
      toast.success("Logo salvo — será aplicado em todos os criativos");
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoImage(null);
    try { localStorage.removeItem("kenia.creative.logo"); } catch {}
  };



  useEffect(() => { load(); loadScheduled(); }, []);
  const load = async () => {
    try {
      const { data } = await api.get("/creatives");
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.creatives) ? data.creatives : [];
      setItems(list);
    } catch {
      setItems([]);
    }
  };

  const loadScheduled = async () => {
    try {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      setScheduled(data || []);
    } catch {
      setScheduled([]);
    }
  };

  const openSchedule = (item) => {
    setScheduleTarget(item);
    setScheduleForm({
      caption: item.caption || "",
      hashtags: "",
      scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      platforms: [item.network || "instagram"],
    });
    setScheduleOpen(true);
  };

  const togglePlatform = (id) => {
    setScheduleForm((s) => ({
      ...s,
      platforms: s.platforms.includes(id)
        ? s.platforms.filter((p) => p !== id)
        : [...s.platforms, id],
    }));
  };

  const saveSchedule = async () => {
    if (!scheduleTarget) return;
    if (!scheduleForm.platforms.length) {
      toast.error("Selecione pelo menos uma rede");
      return;
    }
    if (!scheduleForm.scheduled_for) {
      toast.error("Defina data e hora");
      return;
    }
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        toast.error("Faça login para agendar publicações");
        return;
      }
      const { error } = await supabase.from("scheduled_posts").insert({
        user_id: userId,
        creative_id: scheduleTarget.id,
        title: scheduleTarget.title,
        caption: scheduleForm.caption,
        hashtags: scheduleForm.hashtags || null,
        image_b64: scheduleTarget.image_b64 || null,
        platforms: scheduleForm.platforms,
        scheduled_for: new Date(scheduleForm.scheduled_for).toISOString(),
        status: "scheduled",
      });
      if (error) throw error;
      toast.success("Publicação agendada! As redes conectadas serão postadas automaticamente.", { duration: 6000 });
      setScheduleOpen(false);
      setScheduleTarget(null);
      loadScheduled();
    } catch (e) {
      toast.error(`Não foi possível agendar: ${e.message || e}`);
    }
  };

  const cancelScheduled = async (id) => {
    if (!confirm("Cancelar este agendamento?")) return;
    await supabase.from("scheduled_posts").delete().eq("id", id);
    loadScheduled();
  };


  const generate = async () => {
    if (!form.title || !form.topic) {
      toast.error("Título e tema são obrigatórios");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post("/creatives/generate", {
        ...form,
        reference_image_base64: refImage || null,
        logo_base64: logoImage || null,
      });
      if (data?.image_b64) {
        toast.success("Criativo gerado!");
      } else {
        toast.error(`Imagem não gerada${data?.error ? `: ${String(data.error).slice(0, 120)}` : ""}`);
      }
      setPreview(data);
      setOpen(false);
      setForm({ title: "", network: "instagram", format: "post", topic: "", tone: "profissional", case_type: "", caption: "", subtitle: "", provider: form.provider });
      setRefImage(null);
      // logoImage permanece salvo (persistente) para próximos criativos

      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setEditPrompt(item.last_edit_prompt || "");
    setEditPreview(item.image_b64 || null);
    setEditUpload(null);
  };

  const onPickEditUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Imagem muito grande (máx 8MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setEditUpload(dataUrl);
      setEditPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runEdit = async () => {
    if (!editTarget) return;
    if (!editPrompt.trim()) { toast.error("Descreva a modificação desejada"); return; }
    const sourceImage = editUpload || editTarget.image_b64;
    if (!sourceImage) { toast.error("Sem imagem original para editar"); return; }
    setEditing(true);
    try {
      const { data } = await api.post("/creatives/edit", {
        id: editTarget.id,
        image_base64: sourceImage,
        prompt: editPrompt.trim(),
        title: editTarget.title,
        caption: editTarget.caption,
        network: editTarget.network,
        format: editTarget.format,
        storage_path: editTarget.storage_path || null,
        generated_image_id: editTarget.generated_image_id || null,
      });
      if (data?.ok && (data.image_b64 || data.image)) {
        const next = data.image_b64 || data.image;
        setEditPreview(next);
        setEditUpload(null);
        toast.success("Criativo atualizado");
        load();
      } else {
        toast.error(data?.error || "Não foi possível editar");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Erro ao editar");
    } finally {
      setEditing(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Excluir criativo?")) return;
    await api.delete(`/creatives/${id}`);
    load();
  };

  const copyCaption = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Legenda copiada");
  };

  const download = (item) => {
    if (!item.image_b64) return;
    const a = document.createElement("a");
    a.href = String(item.image_b64 || "").startsWith("http") || String(item.image_b64 || "").startsWith("data:") ? item.image_b64 : `data:image/png;base64,${item.image_b64}`;
    a.download = `legalflow-${item.id}.png`;
    a.click();
  };

  const imageSrc = (value) => {
    const s = String(value || "");
    if (!s) return "";
    if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:")) return s;
    return `data:image/png;base64,${s}`;
  };

  const NetIcon = ({ network, className }) => {
    if (network === "instagram") return <Instagram className={className} />;
    if (network === "facebook") return <Facebook className={className} />;
    return <Linkedin className={className} />;
  };

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 bg-white border-b border-nude-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Powered by IA
          </div>
          <h1 className="font-display font-bold text-xl sm:text-2xl truncate">Criativos para Redes Sociais</h1>
        </div>
        <div className="flex flex-wrap items-center sm:justify-end gap-2 w-full sm:w-auto">
          <Button asChild variant="outline" size="sm" className="border-gold-300 bg-white text-nude-900 hover:bg-gold-50 flex-1 sm:flex-none sm:size-default">
            <Link to="/app/viral-video">
              <Film className="w-4 h-4 mr-2" /> Gerar vídeo
            </Link>
          </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-nude-900 hover:bg-nude-800 flex-1 sm:flex-none sm:size-default" data-testid="ai-generate-post-btn">
              <Wand2 className="w-4 h-4 mr-2" /> Criar com IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gerar Criativo com IA</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Título do Post</Label><Input placeholder="Ex: 5 direitos do trabalhador demitido" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} data-testid="creative-title" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rede Social</Label>
                  <Select value={form.network} onValueChange={v => setForm({ ...form, network: v })}>
                    <SelectTrigger data-testid="creative-network"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Formato</Label>
                  <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                    <SelectTrigger data-testid="creative-format"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="carousel">Carrossel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Caso</Label>
                  <Select value={form.case_type} onValueChange={v => setForm({ ...form, case_type: v })}>
                    <SelectTrigger data-testid="creative-case-type"><SelectValue placeholder="Geral" /></SelectTrigger>
                    <SelectContent>
                      {["Geral", "Família", "Trabalhista", "INSS", "Bancário", "Civil", "Empresarial", "Consumidor"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tom</Label>
                  <Select value={form.tone} onValueChange={v => setForm({ ...form, tone: v })}>
                    <SelectTrigger data-testid="creative-tone"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="informativo">Informativo</SelectItem>
                      <SelectItem value="amigavel">Amigável</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Provedor de imagem</Label>
                <Select value={form.provider} onValueChange={v => setForm({ ...form, provider: v })}>
                  <SelectTrigger data-testid="creative-provider"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático (gratuito + refinamento de crédito)</SelectItem>
                    <SelectItem value="pollinations">Pollinations (gratuito, sem créditos)</SelectItem>
                    <SelectItem value="emergent">Modelo de Crédito (alta qualidade)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Se o modelo de crédito ficar indisponível, o sistema cai automaticamente para Pollinations.</p>
              </div>
              <div><Label>Tema / Mensagem Principal</Label><Textarea rows={3} placeholder="Sobre o que é o post? Qual a mensagem chave?" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} data-testid="creative-topic" /></div>





              <div>
                <Label>Imagem de referência (opcional)</Label>
                <p className="text-xs text-nude-500 mb-1.5">Envie um pôster/modelo para a IA manter layout, cores e estilo, trocando só o conteúdo pedido.</p>
                {refImage ? (
                  <div className="relative inline-block">
                    <img src={refImage} alt="ref" className="h-28 w-28 object-cover rounded-md border border-nude-200" />
                    <button
                      type="button"
                      onClick={() => setRefImage(null)}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow"
                      data-testid="creative-remove-ref"
                      aria-label="Remover imagem"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-nude-300 rounded-md cursor-pointer hover:bg-nude-50 text-sm text-nude-600" data-testid="creative-upload-ref">
                    <Upload className="w-4 h-4" />
                    Clique para enviar imagem (JPG/PNG, até 8MB)
                    <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  </label>
                )}
              </div>

              <div>
                <Label>Logo do escritório {logoImage && <span className="ml-1 text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">salvo · será aplicado sempre</span>}</Label>
                <p className="text-xs text-nude-500 mb-1.5">A IA aplicará seu logo discretamente em todos os criativos gerados (fica salvo no navegador).</p>
                {logoImage ? (
                  <div className="flex items-center gap-3">
                    <div className="relative inline-block">
                      <img src={logoImage} alt="logo" className="h-20 w-20 object-contain rounded-md border border-nude-200 bg-white p-1" />
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow"
                        data-testid="creative-remove-logo"
                        aria-label="Remover logo"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                    <label className="text-xs underline text-nude-600 cursor-pointer">
                      Trocar logo
                      <input type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
                    </label>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-nude-300 rounded-md cursor-pointer hover:bg-nude-50 text-sm text-nude-600" data-testid="creative-upload-logo">
                    <Upload className="w-4 h-4" />
                    Enviar logo (PNG transparente preferível, até 4MB)
                    <input type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
                  </label>
                )}
              </div>

            </div>
            <DialogFooter>
              <Button onClick={generate} disabled={generating} className="bg-nude-900 hover:bg-nude-800" data-testid="creative-generate">
                {generating ? <><span className="animate-pulse-soft">Gerando arte e legenda...</span></> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar com IA</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <CreativeAssetsLibrary onPick={(dataUrl) => { setRefImage(dataUrl); setOpen(true); }} />

        <Card className="p-4 sm:p-6 border-nude-200">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <div className="font-display font-semibold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-600" /> Modelos prontos
              </div>
              <div className="text-sm text-nude-500">
                Clique em "Usar modelo" para preencher o gerador, ou copie a legenda.
              </div>
            </div>
            <div className="flex items-center gap-2">
              {igAccount ? (
                <>
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
                    <Instagram className="w-3 h-3 mr-1" /> @{igAccount.ig_username || "conectado"}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={disconnectInstagram}>
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-xs bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 hover:opacity-90 text-white border-0"
                  onClick={connectInstagram}
                >
                  <Instagram className="w-3.5 h-3.5 mr-1.5" /> Conectar Instagram
                </Button>
              )}
              <Badge variant="outline" className="hidden sm:inline-flex">{CREATIVE_TEMPLATES.length} modelos</Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CREATIVE_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="border border-nude-200 rounded-md p-3 bg-white hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center gap-2 mb-1.5">
                  <NetIcon network={tpl.network} className="w-3.5 h-3.5 text-nude-600" />
                  <Badge variant="outline" className="text-[10px] capitalize">{tpl.case_type}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{tpl.format}</Badge>
                </div>
                <div className="font-semibold text-sm line-clamp-2">{tpl.title}</div>
                <div className="text-xs text-nude-500 mt-1.5 line-clamp-3 flex-1">{tpl.caption}</div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-nude-100">
                  <Button
                    size="sm"
                    className="h-7 text-xs flex-1 bg-nude-900 hover:bg-nude-800"
                    onClick={() => {
                      setForm({
                        title: tpl.title,
                        network: tpl.network,
                        format: tpl.format,
                        topic: tpl.topic,
                        tone: tpl.tone,
                        case_type: tpl.case_type,
                        caption: tpl.caption,
                        subtitle: "",
                      });
                      setOpen(true);
                      toast.success("Modelo carregado no gerador");
                    }}
                  >
                    <Wand2 className="w-3 h-3 mr-1" /> Usar modelo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => copyCaption(`${tpl.title}\n\n${tpl.caption}\n\n${tpl.hashtags || ""}`)}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copiar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {igAccount && (
          <Card className="p-4 sm:p-6 border-nude-200">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <div className="font-display font-semibold text-base flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-500" /> Posts publicados no Instagram
                </div>
                <div className="text-sm text-nude-500">
                  @{igAccount.ig_username} · {igMedia.length} post(s)
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={refreshInstagram} disabled={igLoading}>
                {igLoading ? "Atualizando…" : "Atualizar"}
              </Button>
            </div>
            {igMedia.length === 0 ? (
              <div className="text-sm text-nude-500">Nenhum post publicado ainda. Gere um criativo e clique em "Publicar no Instagram".</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {igMedia.map((m) => (
                  <a key={m.id} href={m.permalink} target="_blank" rel="noopener noreferrer" className="block group">
                    <div className="aspect-square bg-nude-100 rounded-md overflow-hidden">
                      <img src={m.thumbnail_url || m.media_url} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition" />
                    </div>
                    <div className="text-xs text-nude-500 mt-1 line-clamp-2">{m.caption || "Sem legenda"}</div>
                    <div className="text-[10px] text-nude-400 mt-0.5">❤ {m.like_count ?? 0} · 💬 {m.comments_count ?? 0}</div>
                  </a>
                ))}
              </div>
            )}
          </Card>
        )}



        <Card className="p-6 border-nude-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-display font-semibold text-base">Seus criativos gerados</div>
            <div className="text-sm text-nude-500">
              {items.length > 0
                ? `${items.length} criativo(s) salvos · veja, edite e agende em uma página dedicada.`
                : "Nenhum criativo ainda. Gere o primeiro acima."}
            </div>
          </div>
          <Button asChild className="bg-nude-900 hover:bg-nude-800">
            <Link to="/app/creatives/gallery">
              <Sparkles className="w-4 h-4 mr-2" /> Abrir galeria de criativos
            </Link>
          </Button>
        </Card>
      </div>


      {/* Preview dialog */}
      {preview && (
        <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-500" /> Criativo Gerado
              </DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="aspect-square bg-nude-100 rounded-md overflow-hidden">
                {preview.image_b64 ? (
                  <img src={imageSrc(preview.image_b64)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-nude-400">Imagem não gerada</div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="font-display font-semibold text-base mb-2">{preview.title}</div>
                <div className="text-sm text-nude-700 whitespace-pre-wrap flex-1">{preview.caption}</div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => copyCaption(preview.caption)} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" /> Copiar legenda
                  </Button>
                  {preview.image_b64 && (
                    <Button onClick={() => download(preview)} className="flex-1 bg-nude-900 hover:bg-nude-800">
                      <Download className="w-4 h-4 mr-2" /> Baixar
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link to="/app/creatives/gallery">Ver na galeria</Link>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
