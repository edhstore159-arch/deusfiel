import { useEffect, useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { Cloud, Upload, Globe, Trash2, Loader2, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/kenia/contexts/AuthContext";
import { toast } from "sonner";

const BUCKET = "cloud-objects";

export default function CloudHub() {
  const { user, loading: authLoading } = useAuth();
  const [objects, setObjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [busy, setBusy] = useState(false);

  // form state
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("<h1>Olá Mundo</h1>\n<p>Meu primeiro site na Cloud.</p>");

  const refresh = async () => {
    if (!user?.id) return;
    const [{ data: objs }, { data: sts }] = await Promise.all([
      supabase.from("cloud_objects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("cloud_sites").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setObjects(objs || []);
    setSites(sts || []);
  };

  useEffect(() => {
    if (!authLoading && user?.id) refresh();
  }, [authLoading, user?.id]);

  const uploadFile = async (file) => {
    if (!file || !user?.id) return;
    setBusy(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || "";
      const { error: insErr } = await supabase.from("cloud_objects").insert({
        user_id: user.id, name: file.name, path, url, size: file.size, mime: file.type,
      });
      if (insErr) throw insErr;
      toast.success("Arquivo enviado");
      await refresh();
    } catch (e) {
      toast.error("Falha no upload: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteObject = async (o) => {
    setBusy(true);
    try {
      await supabase.storage.from(BUCKET).remove([o.path]);
      await supabase.from("cloud_objects").delete().eq("id", o.id);
      toast.success("Arquivo removido");
      await refresh();
    } catch (e) {
      toast.error("Falha ao remover: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const createSite = async () => {
    if (!user?.id) return;
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
    if (!cleanSlug || !title.trim()) return toast.error("Informe slug e título");
    setBusy(true);
    try {
      const { error } = await supabase.from("cloud_sites").insert({
        user_id: user.id, slug: cleanSlug, title: title.trim(), html, is_public: true,
      });
      if (error) throw error;
      toast.success("Site publicado");
      setSlug(""); setTitle("");
      await refresh();
    } catch (e) {
      toast.error("Falha: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteSite = async (s) => {
    setBusy(true);
    try {
      await supabase.from("cloud_sites").delete().eq("id", s.id);
      toast.success("Site removido");
      await refresh();
    } catch (e) {
      toast.error("Falha: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const siteUrl = (s) => `${window.location.origin}/s/${s.slug}`;

  if (authLoading) {
    return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  }
  if (!user) {
    return <div className="p-6 text-sm">Faça login para usar a Cloud.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Cloud className="h-7 w-7 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Cloud</h1>
          <p className="text-sm text-muted-foreground">Crie sites publicáveis e armazene arquivos.</p>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">Online</Badge>
      </header>

      {/* Sites */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold">Sites</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="slug (ex: meu-site)" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Input placeholder="Título do site" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Textarea rows={6} value={html} onChange={(e) => setHtml(e.target.value)} placeholder="HTML do site" className="font-mono text-xs" />
        <Button onClick={createSite} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
          Publicar site
        </Button>

        <div className="space-y-2">
          {sites.length === 0 && <p className="text-sm text-muted-foreground">Nenhum site ainda.</p>}
          {sites.map((s) => (
            <div key={s.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground truncate">{siteUrl(s)}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(siteUrl(s)); toast.success("URL copiada"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" asChild>
                  <a href={siteUrl(s)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteSite(s)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Objects */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold">Objetos (arquivos)</h2>
        </div>
        <label className="block">
          <input type="file" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 text-white cursor-pointer hover:bg-amber-600">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar arquivo
          </span>
        </label>
        <div className="space-y-2">
          {objects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum arquivo ainda.</p>}
          {objects.map((o) => (
            <div key={o.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{o.name}</div>
                <div className="text-xs text-muted-foreground">{(o.size / 1024).toFixed(1)} KB · {o.mime || "arquivo"}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(o.url); toast.success("URL copiada"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" asChild>
                  <a href={o.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteObject(o)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
