import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { Upload, Trash2, ImageIcon, Loader2, Search, Check } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "creative-assets";

export default function CreativeAssetsLibrary({ onPick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [signed, setSigned] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setItems([]); setSigned({}); return; }

      const { data: rows } = await supabase
        .from("generated_images")
        .select("id, storage_path, prompt, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(200);

      const tablePaths = new Set((rows || []).map((r) => r.storage_path).filter(Boolean));

      const { data: files } = await supabase.storage
        .from(BUCKET)
        .list(uid, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

      const storageFiles = (files || []).filter((f) => f.name);
      const storagePaths = new Set(storageFiles.map((f) => `${uid}/${f.name}`));

      const orphanPaths = [...storagePaths].filter((p) => !tablePaths.has(p));
      for (const path of orphanPaths) {
        await supabase.from("generated_images").insert({
          user_id: uid, storage_path: path,
          prompt: path.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim() || null,
          kind: "creative", paid: false,
        }).maybeSingle();
      }

      const allPaths = orphanPaths.length > 0
        ? [...storagePaths].filter(Boolean)
        : [...tablePaths].filter(Boolean);

      const { data: urls } = allPaths.length > 0
        ? await supabase.storage.from(BUCKET).createSignedUrls(allPaths, 60 * 60 * 24 * 7)
        : { data: [] };

      const urlByPath = {};
      (urls || []).forEach((s, i) => { if (s?.signedUrl) urlByPath[allPaths[i]] = s.signedUrl; });

      const merged = (rows || []).map((r) => ({
        id: r.id,
        name: r.prompt || r.storage_path.split("/").pop() || "Imagem",
        storage_path: r.storage_path,
        image_b64: urlByPath[r.storage_path] || null,
        mime_type: "image/png",
        size_bytes: null,
        width: null,
        height: null,
        tags: [],
        description: "",
      }));

      const orphanItems = orphanPaths.map((p) => ({
        id: `orphan-${p.split("/").pop()}`,
        name: p.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim() || "Imagem",
        storage_path: p,
        image_b64: urlByPath[p] || null,
        mime_type: "image/png",
        size_bytes: null,
        width: null,
        height: null,
        tags: [],
        description: "",
      }));

      const urlMap = {};
      [...merged, ...orphanItems].forEach((it) => {
        if (it.image_b64) urlMap[it.id] = it.image_b64;
      });
      setSigned(urlMap);
      setItems([...merged, ...orphanItems]);
    } catch (e) {
      if (mountedRef.current) {
        toast.error("Falha ao carregar biblioteca: " + (e?.message || e));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const files = e?.target?.files || [];
    if (!files.length) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { toast.error("Faça login para enviar imagens."); return; }
      let uploaded = 0;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: máx 10MB.`); continue; }
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: file.type,
        });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("generated_images").insert({
          user_id: uid, storage_path: path, prompt: file.name, kind: "creative", paid: false,
        });
        if (insErr) throw insErr;
        uploaded++;
      }
      if (uploaded > 0) { toast.success(`${uploaded} imagem(ns) enviada(s).`); await load(); }
    } catch (err) {
      toast.error("Falha ao enviar: " + (err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (item) => {
    if (!confirm(`Remover "${item.name}"?`)) return;
    try {
      await supabase.storage.from(BUCKET).remove([item.storage_path]);
      const isOrphan = String(item.id).startsWith("orphan-");
      if (!isOrphan) {
        await supabase.from("generated_images").delete().eq("id", item.id).maybeSingle();
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Removido.");
    } catch (e) {
      toast.error("Falha ao remover: " + (e?.message || e));
    }
  };

  const pick = async (item) => {
    if (!onPick) return;
    const url = signed[item.id];
    if (!url) { toast.error("Imagem indisponível"); return; }
    try {
      const blob = await (await fetch(url)).blob();
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(blob);
      });
      onPick(dataUrl, item);
    } catch (e) {
      toast.error("Falha ao usar imagem: " + (e?.message || e));
    }
  };

  const filtered = items.filter((i) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (i.name || "").toLowerCase().includes(s)
      || (i.description || "").toLowerCase().includes(s)
      || (i.tags || []).some((t) => String(t).toLowerCase().includes(s));
  });

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-gold-700" />
          <h3 className="font-serif text-nude-900">Biblioteca de imagens</h3>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-nude-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-7 h-8 w-44" />
          </div>
          <Button asChild size="sm" disabled={uploading}>
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Enviar
              <input type="file" multiple accept="image/*" className="hidden" onChange={upload} />
            </label>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-nude-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-nude-600">Nenhuma imagem ainda. Envie fotos, logos ou referências para reutilizar nos criativos.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((it) => (
            <div key={it.id} className="group relative border border-nude-200 rounded-lg overflow-hidden bg-nude-50">
              <div className="aspect-square w-full bg-nude-100 flex items-center justify-center">
                {signed[it.id] ? (
                  <img src={signed[it.id]} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-nude-400" />
                )}
              </div>
              <div className="p-2">
                <div className="text-xs font-medium text-nude-900 truncate" title={it.name}>{it.name}</div>
                <div className="text-[10px] text-nude-500">
                  {it.width && it.height ? `${it.width}x${it.height}` : ""}
                  {it.size_bytes ? ` ${Math.round(it.size_bytes / 1024)} KB` : ""}
                </div>
              </div>
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                {onPick && (
                  <button onClick={() => pick(it)} title="Usar como referência"
                    className="bg-gold-600 hover:bg-gold-700 text-white rounded p-1">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => remove(it)} title="Remover"
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}