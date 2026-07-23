import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Label } from "@/kenia/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/kenia/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { Image, FileText, Film, Headphones, Folder, FolderOpen, Download, Trash2, Pencil, ArrowLeft, Search, X, Eye, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const FOLDERS = ["Geral", "Documentos", "Provas", "Contratos", "Imagens", "Áudios", "Outros"];

const mediaIcon = (type) => {
  if (type === "image") return <Image className="w-4 h-4" />;
  if (type === "video") return <Film className="w-4 h-4" />;
  if (type === "document") return <FileText className="w-4 h-4" />;
  if (type === "audio") return <Headphones className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const mediaColor = (type) => {
  if (type === "image") return "bg-blue-100 text-blue-700";
  if (type === "video") return "bg-purple-100 text-purple-700";
  if (type === "document") return "bg-amber-100 text-amber-700";
  if (type === "audio") return "bg-green-100 text-green-700";
  return "bg-nude-100 text-nude-700";
};

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function WhatsAppMedia() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editItem, setEditItem] = useState(null);
  const [editFolder, setEditFolder] = useState("Geral");
  const [editDesc, setEditDesc] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [contactFilter, setContactFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/whatsapp/media");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const contacts = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = it.phone || it.jid || "unknown";
      if (!map.has(key)) map.set(key, { phone: key, name: it.contact_name || key, count: 0 });
      map.get(key).count++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (folderFilter !== "all") list = list.filter(it => (it.folder || "Geral") === folderFilter);
    if (typeFilter !== "all") list = list.filter(it => it.media_type === typeFilter);
    if (contactFilter !== "all") list = list.filter(it => (it.phone || it.jid) === contactFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        (it.contact_name || "").toLowerCase().includes(q) ||
        (it.phone || "").includes(q) ||
        (it.caption || "").toLowerCase().includes(q) ||
        (it.description || "").toLowerCase().includes(q) ||
        (it.filename || "").toLowerCase().includes(q) ||
        (it.folder || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, folderFilter, typeFilter, contactFilter, search]);

  const folderCounts = useMemo(() => {
    const counts = { all: items.length };
    for (const it of items) {
      const f = it.folder || "Geral";
      counts[f] = (counts[f] || 0) + 1;
    }
    return counts;
  }, [items]);

  const typeCounts = useMemo(() => {
    const counts = { all: items.length };
    for (const it of items) {
      counts[it.media_type] = (counts[it.media_type] || 0) + 1;
    }
    return counts;
  }, [items]);

  const openEdit = (item) => {
    setEditItem(item);
    setEditFolder(item.folder || "Geral");
    setEditDesc(item.description || "");
  };

  const saveEdit = async () => {
    if (!editItem) return;
    try {
      await api.patch(`/whatsapp/media/${editItem.id}`, { folder: editFolder, description: editDesc });
      setItems(prev => prev.map(it => it.id === editItem.id ? { ...it, folder: editFolder, description: editDesc } : it));
      setEditItem(null);
      toast.success("Arquivo atualizado");
    } catch (e) {
      toast.error("Erro ao salvar: " + (e?.message || e));
    }
  };

  const removeItem = async (item) => {
    if (!confirm("Excluir este arquivo?")) return;
    try {
      await api.delete(`/whatsapp/media/${item.id}`);
      setItems(prev => prev.filter(it => it.id !== item.id));
      toast.success("Arquivo excluído");
    } catch (e) {
      toast.error("Erro ao excluir: " + (e?.message || e));
    }
  };

  const downloadItem = (item) => {
    if (!item.signed_url) { toast.error("URL de download indisponível"); return; }
    const a = document.createElement("a");
    a.href = item.signed_url;
    a.download = item.filename || `${item.media_type}_${item.id}`;
    a.target = "_blank";
    a.click();
  };

  const isImage = (it) => it.media_type === "image" && it.signed_url;
  const isVideo = (it) => it.media_type === "video" && it.signed_url;

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-white border-b border-nude-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="px-2">
            <Link to="/app/whatsapp"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold flex items-center gap-1.5">
              <Folder className="w-3 h-3" /> WhatsApp
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl truncate">Arquivos Recebidos</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{items.length} arquivo(s)</Badge>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-6 space-y-4">
        {/* Filters */}
        <Card className="p-3 sm:p-4 border-nude-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nude-400" />
              <Input
                placeholder="Buscar por contato, legenda, arquivo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-nude-400 hover:text-nude-700" />
                </button>
              )}
            </div>
            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pasta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas pastas</SelectItem>
                {FOLDERS.map(f => <SelectItem key={f} value={f}>{f} ({folderCounts[f] || 0})</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="image">Imagens ({typeCounts.image || 0})</SelectItem>
                <SelectItem value="video">Vídeos ({typeCounts.video || 0})</SelectItem>
                <SelectItem value="document">Documentos ({typeCounts.document || 0})</SelectItem>
                <SelectItem value="audio">Áudios ({typeCounts.audio || 0})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={contactFilter} onValueChange={setContactFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Contato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos contatos</SelectItem>
                {contacts.map(c => (
                  <SelectItem key={c.phone} value={c.phone}>{c.name} ({c.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Folder tabs */}
        <div className="flex flex-wrap gap-1.5">
          {FOLDERS.map(f => (
            <button
              key={f}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                folderFilter === f
                  ? "bg-nude-900 text-white border-nude-900"
                  : "border-nude-200 text-nude-600 hover:bg-nude-100"
              }`}
              onClick={() => setFolderFilter(folderFilter === f ? "all" : f)}
            >
              {folderFilter === f ? <FolderOpen className="w-3 h-3" /> : <Folder className="w-3 h-3" />}
              {f}
              <span className="text-[10px] opacity-70">({folderCounts[f] || 0})</span>
            </button>
          ))}
        </div>

        {/* Files grid */}
        {filtered.length === 0 ? (
          <Card className="p-8 border-nude-200 text-center">
            <Folder className="w-10 h-10 text-nude-300 mx-auto mb-3" />
            <div className="text-nude-500 text-sm">
              {items.length === 0
                ? "Nenhum arquivo recebido via WhatsApp ainda."
                : "Nenhum arquivo encontrado com os filtros selecionados."}
            </div>
            <p className="text-xs text-nude-400 mt-1">
              Os arquivos são salvos automaticamente quando clientes enviam imagens, documentos ou vídeos.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((item) => (
              <Card key={item.id} className="border-nude-200 overflow-hidden bg-white hover:shadow-md transition-shadow group">
                {/* Preview area */}
                <div className="relative aspect-square bg-nude-100">
                  {isImage(item) ? (
                    <img src={item.signed_url} alt={item.caption || ""} className="w-full h-full object-cover" loading="lazy" />
                  ) : isVideo(item) ? (
                    <video src={item.signed_url} className="w-full h-full object-cover" preload="metadata" />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <div className={`p-4 rounded-full ${mediaColor(item.media_type)}`}>
                        {mediaIcon(item.media_type)}
                      </div>
                    </div>
                  )}
                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className={`${mediaColor(item.media_type)} border-0 text-[10px] capitalize`}>
                      {mediaIcon(item.media_type)} <span className="ml-1">{item.media_type === "image" ? "Imagem" : item.media_type === "video" ? "Vídeo" : item.media_type === "document" ? "Doc" : "Áudio"}</span>
                    </Badge>
                  </div>
                  {/* Folder badge */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-white/90 text-nude-600 text-[10px] backdrop-blur">
                      {item.folder || "Geral"}
                    </Badge>
                  </div>
                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0 bg-white/90" onClick={() => setPreviewItem(item)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0 bg-white/90" onClick={() => downloadItem(item)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0 bg-white/90" onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0 bg-white/90 text-red-600" onClick={() => removeItem(item)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-nude-400" />
                    <span className="text-xs font-medium text-nude-700 truncate">{item.contact_name || item.phone}</span>
                  </div>
                  {(item.caption || item.description) && (
                    <div className="text-[11px] text-nude-500 line-clamp-2 mt-1">{item.description || item.caption}</div>
                  )}
                  <div className="flex items-center justify-between mt-2 text-[10px] text-nude-400">
                    <span>{formatDate(item.created_at)}</span>
                    <span>{formatSize(item.file_size)}</span>
                  </div>
                  {item.filename && (
                    <div className="text-[10px] text-nude-400 truncate mt-0.5">{item.filename}</div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar arquivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {isImage(editItem) && <img src={editItem.signed_url} alt="" className="w-16 h-16 rounded object-cover" />}
                <div>
                  <div className="text-sm font-medium">{editItem.contact_name || editItem.phone}</div>
                  <div className="text-xs text-nude-500">{formatDate(editItem.created_at)} · {formatSize(editItem.file_size)}</div>
                </div>
              </div>
              <div>
                <Label>Pasta</Label>
                <Select value={editFolder} onValueChange={setEditFolder}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  placeholder="Ex: Documento de identidade, contrato assinado, foto da peça..."
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                />
              </div>
              {editItem.caption && (
                <div>
                  <Label>Legenda original</Label>
                  <div className="text-xs text-nude-500 bg-nude-50 p-2 rounded">{editItem.caption}</div>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
                <Button className="bg-nude-900 hover:bg-nude-800" onClick={saveEdit}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview dialog */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {mediaIcon(previewItem.media_type)}
                <span>{previewItem.contact_name || previewItem.phone}</span>
                <Badge variant="outline" className="text-[10px]">{previewItem.folder || "Geral"}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {isImage(previewItem) && (
                <img src={previewItem.signed_url} alt="" className="w-full rounded-md" />
              )}
              {isVideo(previewItem) && (
                <video src={previewItem.signed_url} controls className="w-full rounded-md" />
              )}
              {!isImage(previewItem) && !isVideo(previewItem) && previewItem.signed_url && (
                <a href={previewItem.signed_url} target="_blank" rel="noopener noreferrer" className="block text-center p-8 bg-nude-50 rounded-md text-nude-600 hover:bg-nude-100">
                  Abrir arquivo
                </a>
              )}
              {(previewItem.description || previewItem.caption) && (
                <div className="text-sm text-nude-700 bg-nude-50 p-3 rounded">
                  {previewItem.description || previewItem.caption}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-nude-500">
                <span>{formatDate(previewItem.created_at)} · {formatSize(previewItem.file_size)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadItem(previewItem)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Baixar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setPreviewItem(null); openEdit(previewItem); }}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
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
