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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/kenia/components/ui/dialog";
import { Sparkles, Instagram, Facebook, Linkedin, Trash2, Download, Copy, Wand2, Upload, CalendarClock, Pencil, ArrowLeft, RotateCcw, Archive, Box } from "lucide-react";
import Immersive3DViewer from "@/kenia/components/Immersive3DViewer";
import { toast } from "sonner";

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

export default function CreativesGallery() {
  const [items, setItems] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    caption: "", hashtags: "", scheduled_for: "", platforms: ["instagram"],
  });
  const [editTarget, setEditTarget] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [editPreview, setEditPreview] = useState(null);
  const [editUpload, setEditUpload] = useState(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState([]);
  const [viewer3D, setViewer3D] = useState(null); // { image_b64, title }

  const TRASH_KEY = "creatives-trash-v1";
  const loadTrash = () => {
    try {
      const raw = localStorage.getItem(TRASH_KEY);
      if (!raw) { setTrash([]); return; }
      const parsed = JSON.parse(raw);
      // Strip any legacy image_b64 data to keep localStorage lean
      const lean = Array.isArray(parsed) ? parsed.map(({ image_b64, signed_url, image_url, ...meta }) => meta) : [];
      setTrash(lean);
      try { localStorage.setItem(TRASH_KEY, JSON.stringify(lean)); } catch {
        // localStorage full — try to free space by removing stale keys
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("kenia.gallery.cache") || k.startsWith("kenia.creatives.cache"))
            .forEach((k) => localStorage.removeItem(k));
          localStorage.setItem(TRASH_KEY, JSON.stringify(lean));
        } catch {}
      }
    } catch { setTrash([]); }
  };
  const saveTrash = (list) => {
    const lean = list.map(({ image_b64, signed_url, ...meta }) => meta).slice(0, 100);
    try { localStorage.setItem(TRASH_KEY, JSON.stringify(lean)); } catch (e) {
      toast.error("Não foi possível salvar na lixeira: sem espaço no navegador");
      return;
    }
    setTrash(lean);
  };

  useEffect(() => { load(); loadScheduled(); loadTrash(); }, []);

  const load = async () => {
    try {
      const { data } = await api.get("/creatives");
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.creatives) ? data.creatives : [];
      const seenIds = new Set();
      const unique = list.filter((it) => {
        if (!it) return false;
        const id = it.id ?? null;
        if (id && seenIds.has(id)) return false;
        if (id) seenIds.add(id);
        return true;
      });
      setItems(unique);
      const leanCache = unique.map(({ image_b64, signed_url, image_url, ...meta }) => meta);
      try { localStorage.setItem("kenia.gallery.cache", JSON.stringify(leanCache.slice(0, 100))); } catch {}
    } catch {
      try {
        const cached = JSON.parse(localStorage.getItem("kenia.gallery.cache") || "[]");
        setItems(cached);
      } catch { setItems([]); }
    }
  };

  const recoverImages = async () => {
    let recovered = 0;
    const updated = await Promise.all(items.map(async (item) => {
      if (imageSrc(item)) return item;
      if (!item.storage_path) return item;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await supabase.storage.from("creative-assets").createSignedUrl(item.storage_path, 60 * 60 * 24 * 7);
        if (resp.data?.signedUrl) {
          recovered++;
          return { ...item, image_b64: resp.data.signedUrl };
        }
      } catch {}
      return item;
    }));
    if (recovered > 0) {
      setItems(updated);
      toast.success(`${recovered} imagem(ns) recuperada(s)`);
      const leanUpdated = updated.map(({ image_b64, signed_url, image_url, ...meta }) => meta);
      try { localStorage.setItem("kenia.gallery.cache", JSON.stringify(leanUpdated.slice(0, 100))); } catch {}
    } else {
      toast.message("Nenhuma imagem para recuperar");
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
    } catch { setScheduled([]); }
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
      platforms: s.platforms.includes(id) ? s.platforms.filter((p) => p !== id) : [...s.platforms, id],
    }));
  };

  const saveSchedule = async () => {
    if (!scheduleTarget) return;
    if (!scheduleForm.platforms.length) { toast.error("Selecione pelo menos uma rede"); return; }
    if (!scheduleForm.scheduled_for) { toast.error("Defina data e hora"); return; }
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { toast.error("Faça login para agendar publicações"); return; }
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
      toast.success("Publicação agendada!", { duration: 6000 });
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

  const remove = async (item) => {
    const id = typeof item === "object" ? item?.id : item;
    if (!id) return;
    if (!confirm("Enviar esta imagem para a lixeira? Você poderá recuperá-la depois.")) return;
    try {
      // Snapshot para lixeira (só metadados, sem image_b64 — a imagem fica no Storage via storage_path)
      if (typeof item === "object") {
        const { image_b64, signed_url, ...meta } = item;
        const snapshot = { ...meta, deleted_at: new Date().toISOString() };
        const next = [snapshot, ...trash.filter((t) => t.id !== id)];
        saveTrash(next);
      }

      // Best-effort: remove dos registros do banco (mantemos storage para permitir restauração)
      try { await api.delete(`/creatives/${id}`); } catch {}
      try { await supabase.from("generated_images").delete().eq("id", id); } catch {}

      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success("Movida para a lixeira", { description: "Abra a Lixeira para recuperar." });
    } catch (e) {
      toast.error(`Não foi possível excluir: ${e.message || e}`);
    }
  };

  const restore = async (item) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      let imageUrl = item.image_b64 || null;
      if (!imageUrl && item.storage_path) {
        try {
          const resp = await supabase.storage.from("creative-assets").createSignedUrl(item.storage_path, 60 * 60 * 24 * 7);
          if (resp.data?.signedUrl) imageUrl = resp.data.signedUrl;
        } catch {}
      }
      const payload = {
        user_id: userId || null,
        title: item.title || null,
        caption: item.caption || null,
        image_b64: imageUrl,
        network: item.network || null,
        format: item.format || null,
        storage_path: item.storage_path || null,
      };
      // Reinserir em generated_images
      let restored = false;
      try {
        const { error } = await supabase.from("generated_images").insert(payload);
        if (!error) restored = true;
      } catch {}
      const next = trash.filter((t) => t.id !== item.id);
      saveTrash(next);
      toast.success(restored ? "Criativo recuperado" : "Recuperado localmente");
      load();
    } catch (e) {
      toast.error(`Não foi possível recuperar: ${e.message || e}`);
    }
  };

  const purge = async (item) => {
    if (!confirm("Excluir permanentemente? Esta ação não pode ser desfeita.")) return;
    if (item.storage_path) {
      try { await supabase.storage.from("creative-assets").remove([item.storage_path]); } catch {}
    }
    const next = trash.filter((t) => t.id !== item.id);
    saveTrash(next);
    toast.success("Excluído permanentemente");
  };

  const emptyTrash = async () => {
    if (!trash.length) return;
    if (!confirm(`Esvaziar lixeira (${trash.length} itens) permanentemente?`)) return;
    const paths = trash.map((t) => t.storage_path).filter(Boolean);
    if (paths.length) {
      try { await supabase.storage.from("creative-assets").remove(paths); } catch {}
    }
    saveTrash([]);
    toast.success("Lixeira esvaziada");
  };

  const restoreAll = async () => {
    if (!trash.length) return;
    let ok = 0;
    for (const it of [...trash]) {
      try { await restore(it); ok++; } catch {}
    }
    toast.success(`${ok} criativo(s) recuperado(s)`);
  };

  const recoverFromStorage = async () => {
    try {
      toast.loading("Procurando criativos no armazenamento...", { id: "recover-storage" });
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { toast.error("Faça login para recuperar", { id: "recover-storage" }); return; }
      const { data: files, error } = await supabase.storage.from("creative-assets").list(userId, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const existingPaths = new Set(items.map((i) => i.storage_path).filter(Boolean));
      const orphans = (files || []).filter((f) => f.name && !existingPaths.has(`${userId}/${f.name}`));
      if (!orphans.length) { toast.success("Nada para recuperar do armazenamento", { id: "recover-storage" }); return; }
      let restored = 0;
      for (const f of orphans) {
        const storage_path = `${userId}/${f.name}`;
        // Evita duplicar: se já existe uma linha para este storage_path, pula.
        const { data: existing } = await supabase
          .from("generated_images")
          .select("id")
          .eq("storage_path", storage_path)
          .limit(1);
        if (existing && existing.length) continue;
        const { data: signed } = await supabase.storage.from("creative-assets").createSignedUrl(storage_path, 60 * 60 * 24 * 7);
        const payload = {
          user_id: userId,
          title: f.name.replace(/\.[^.]+$/, ""),
          image_b64: signed?.signedUrl || null,
          storage_path,
        };
        const { error: insErr } = await supabase.from("generated_images").insert(payload);
        if (!insErr) restored++;
      }
      toast.success(`${restored} criativo(s) recuperado(s) do armazenamento`, { id: "recover-storage" });
      load();
    } catch (e) {
      toast.error(`Falha ao recuperar: ${e.message || e}`, { id: "recover-storage" });
    }
  };

  const copyCaption = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Legenda copiada");
  };

  const download = (item) => {
    if (!item.image_b64) return;
    const a = document.createElement("a");
    a.href = imageSrc(item);
    a.download = `legalflow-${item.id}.png`;
    a.click();
  };

  const imageSrc = (item) => {
    if (!item) return "";
    const candidates = [item.image_b64, item.signedUrl, item.url, item.image_url, item.image].filter(Boolean);
    for (const c of candidates) {
      const s = String(c);
      if (s.length === 0) continue;
      if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:")) return s;
      return `data:image/png;base64,${s}`;
    }
    return "";
  };

  const hasImage = (item) => Boolean(imageSrc(item));

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
            <Sparkles className="w-3 h-3" /> Galeria
          </div>
          <h1 className="font-display font-bold text-xl sm:text-2xl truncate">Criativos Gerados</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
            onClick={recoverImages}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Recuperar imagens
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-sky-300 bg-white text-sky-700 hover:bg-sky-50"
            onClick={recoverFromStorage}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Recuperar excluídos
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`border-gold-300 bg-white text-nude-900 hover:bg-gold-50 ${showTrash ? "ring-2 ring-gold-400" : ""}`}
            onClick={() => setShowTrash((v) => !v)}
          >
            <Archive className="w-4 h-4 mr-2" />
            Lixeira {trash.length > 0 && <Badge className="ml-2 bg-rose-500 text-white">{trash.length}</Badge>}
          </Button>
          <Button asChild variant="outline" size="sm" className="border-gold-300 bg-white text-nude-900 hover:bg-gold-50">
            <Link to="/app/creatives">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao gerador
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {showTrash ? (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-semibold flex items-center gap-2">
                <Archive className="w-4 h-4 text-gold-600" /> Lixeira ({trash.length})
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-sky-200 text-sky-700 hover:bg-sky-50" onClick={recoverFromStorage}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Recuperar do armazenamento
                </Button>
                {trash.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={restoreAll}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Recuperar todos
                    </Button>
                    <Button variant="outline" size="sm" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={emptyTrash}>
                      <Trash2 className="w-3 h-3 mr-1" /> Esvaziar
                    </Button>
                  </>
                )}
              </div>
            </div>
            {trash.length === 0 ? (
              <div className="text-sm text-nude-500 py-8 text-center">A lixeira está vazia.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {trash.map((it) => (
                  <Card key={`trash-${it.id}`} className="overflow-hidden border-nude-200 opacity-90">
                    <div className="aspect-square bg-nude-100 relative">
                      {hasImage(it) ? (
                        <img src={imageSrc(it)} alt={it.title} className="w-full h-full object-cover grayscale" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-nude-300"><Sparkles className="w-8 h-8" /></div>
                      )}
                    </div>
                    <div className="p-2 space-y-1">
                      <div className="text-xs font-medium line-clamp-1">{it.title || "Sem título"}</div>
                      <div className="text-[10px] text-nude-500">Excluída {it.deleted_at ? new Date(it.deleted_at).toLocaleString("pt-BR") : ""}</div>
                      <div className="grid grid-cols-2 gap-1 pt-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => restore(it)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Recuperar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => purge(it)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-12 border-dashed border-nude-300 text-center">
            <div className="w-12 h-12 rounded-md bg-gold-100 grid place-items-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-gold-700" />
            </div>
            <div className="font-display font-semibold text-lg mb-1">Nenhum criativo ainda</div>
            <div className="text-sm text-nude-500 mb-4 max-w-sm mx-auto">
              Gere posts no gerador e eles aparecerão aqui.
            </div>
            <Button asChild className="bg-nude-900 hover:bg-nude-800">
              <Link to="/app/creatives"><Wand2 className="w-4 h-4 mr-2" /> Ir ao gerador</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item, idx) => (
              <Card key={item.id || `creative-${idx}`} className="overflow-hidden border-nude-200 hover:shadow-md transition-shadow">

                <div className="aspect-square bg-nude-100 relative overflow-hidden">
                  {hasImage(item) ? (
                    <img src={imageSrc(item)} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-nude-300">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-white/90 text-nude-900 hover:bg-white/90 gap-1 backdrop-blur">
                    <NetIcon network={item.network} className="w-3 h-3" />
                    {item.network}
                  </Badge>
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm line-clamp-1">{item.title}</div>
                  <div className="text-xs text-nude-500 line-clamp-3 mt-1.5 whitespace-pre-wrap min-h-[3rem]">{item.caption}</div>
                  <div className="grid grid-cols-2 gap-1 mt-3 pt-3 border-t border-nude-100">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyCaption(item.caption)}>
                      <Copy className="w-3 h-3 mr-1" /> Legenda
                    </Button>
                    {hasImage(item) && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => download(item)}>
                        <Download className="w-3 h-3 mr-1" /> PNG
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(item)}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openSchedule(item)}>
                      <CalendarClock className="w-3 h-3 mr-1" /> Agendar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs col-span-2 text-gold-700 hover:bg-gold-50"
                      onClick={() => setViewer3D({
                        src: imageSrc(item),
                        title: item.title,
                      })}>
                      <Box className="w-3 h-3 mr-1" /> Visualizar em 3D / 4D
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs col-span-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => remove(item)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir imagem
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {scheduled.length > 0 && (
        <div className="border-t border-nude-200 bg-white px-6 py-4 max-h-64 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="font-display font-semibold text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-gold-600" /> Publicações agendadas
            </div>
            <div className="text-xs text-nude-500">{scheduled.length} na fila</div>
          </div>
          <div className="space-y-2">
            {scheduled.map((p) => (
              <div key={p.id} className="flex items-center gap-3 text-xs bg-nude-50 border border-nude-200 rounded-md px-3 py-2">
                {hasImage(p) ? (
                    <img src={imageSrc(p)} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-nude-200 grid place-items-center text-nude-400"><Sparkles className="w-4 h-4" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.title || p.caption?.slice(0, 60) || "Post"}</div>
                  <div className="text-nude-500 truncate">
                    {p.scheduled_for ? new Date(p.scheduled_for).toLocaleString("pt-BR") : "sem data"} • {(p.platforms || []).join(", ") || "—"}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{p.status}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => cancelScheduled(p.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-gold-600" /> Agendar publicação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Legenda</Label>
              <Textarea rows={4} value={scheduleForm.caption} onChange={(e) => setScheduleForm({ ...scheduleForm, caption: e.target.value })} />
            </div>
            <div>
              <Label>Hashtags (opcional)</Label>
              <Input placeholder="#direitos #advocacia" value={scheduleForm.hashtags} onChange={(e) => setScheduleForm({ ...scheduleForm, hashtags: e.target.value })} />
            </div>
            <div>
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={scheduleForm.scheduled_for} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_for: e.target.value })} />
            </div>
            <div>
              <Label>Redes</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {PLATFORMS.map((p) => {
                  const active = scheduleForm.platforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-nude-900 text-white border-nude-900" : "bg-white text-nude-700 border-nude-300 hover:bg-nude-50"}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveSchedule} className="bg-nude-900 hover:bg-nude-800">
              <CalendarClock className="w-4 h-4 mr-2" /> Confirmar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editTarget && (
        <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) { setEditTarget(null); setEditPreview(null); setEditUpload(null); setEditPrompt(""); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-gold-600" /> Editar criativo com IA
              </DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="aspect-square bg-nude-100 rounded-md overflow-hidden border border-nude-200">
                  {editPreview ? (
                    <img src={imageSrc({ image_b64: editPreview })} alt="Prévia" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-nude-400 text-sm">Sem imagem</div>
                  )}
                </div>
                <label className="flex items-center justify-center gap-2 h-10 border border-dashed border-nude-300 rounded-md cursor-pointer hover:bg-nude-50 text-xs text-nude-600">
                  <Upload className="w-3.5 h-3.5" />
                  {editUpload ? "Trocar imagem base" : "Enviar nova imagem base (opcional)"}
                  <input type="file" accept="image/*" className="hidden" onChange={onPickEditUpload} />
                </label>
              </div>
              <div className="flex flex-col">
                <Label>Modificações desejadas</Label>
                <Textarea
                  rows={8}
                  className="mt-1.5 flex-1"
                  placeholder="Ex.: Troque o fundo por um escritório de advocacia moderno..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                />
                <div className="flex gap-2 mt-3">
                  <Button onClick={runEdit} disabled={editing} className="flex-1 bg-nude-900 hover:bg-nude-800">
                    {editing ? <span className="animate-pulse-soft">Aplicando edição...</span> : <><Wand2 className="w-4 h-4 mr-2" /> Aplicar com IA</>}
                  </Button>
                  {editPreview && (
                    <Button variant="outline" onClick={() => download({ id: editTarget.id, image_b64: editPreview })}>
                      <Download className="w-4 h-4 mr-2" /> Baixar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Immersive3DViewer
        open={!!viewer3D}
        image={viewer3D?.src || null}
        title={viewer3D?.title}
        onClose={() => setViewer3D(null)}
      />
    </div>
  );
}
