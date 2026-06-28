import { useEffect, useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { Cloud, Upload, Globe, Trash2, Loader2, Copy, ExternalLink, Eye, Image as ImageIcon, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/kenia/contexts/AuthContext";
import { toast } from "sonner";

const BUCKET = "cloud-objects";

export default function CloudHub() {
  const { user, loading: authLoading } = useAuth();
  const [objects, setObjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imagePrompt, setImagePrompt] = useState("imagem profissional para site jurídico, elegante, fundo claro, detalhes em dourado");
  const [imageResult, setImageResult] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);

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
    const objectsWithFreshUrls = await Promise.all((objs || []).map(async (item) => {
      if (!item.path) return item;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(item.path, 60 * 60 * 24 * 365);
      return { ...item, url: signed?.signedUrl || item.url };
    }));
    setObjects(objectsWithFreshUrls);
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

  const previewDraft = () => {
    setPreview({ type: "site", title: title.trim() || "Pré-visualização", html });
  };

  const previewSite = (site) => {
    setPreview({ type: "site", title: site.title, html: site.html, url: siteUrl(site) });
  };

  const previewObject = (object) => {
    setPreview({ type: "object", title: object.name, object });
  };

  const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const generateCloudImage = async () => {
    if (!user?.id) return;
    const cleanPrompt = imagePrompt.trim();
    if (!cleanPrompt) return toast.error("Descreva a imagem para gerar");
    setGeneratingImage(true);
    setImageResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-image", {
        body: {
          prompt: cleanPrompt,
          title: cleanPrompt,
          network: "cloud",
          format: "1024x1024",
          tone: "profissional elegante",
          case_type: "cloud-site",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const imageDataUrl = data?.image_data_url || (data?.b64_json ? `data:image/png;base64,${data.b64_json}` : "");
      if (!imageDataUrl) throw new Error("A geração não retornou imagem");

      setImageResult(imageDataUrl);
      const blob = await dataUrlToBlob(imageDataUrl);
      const mime = blob.type || (imageDataUrl.startsWith("data:image/svg") ? "image/svg+xml" : "image/png");
      const ext = mime.includes("svg") ? "svg" : "png";
      const safeName = cleanPrompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "imagem-cloud";
      const path = `${user.id}/generated-${Date.now()}-${safeName}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      const storedObject = {
        user_id: user.id,
        name: `${safeName}.${ext}`,
        path,
        url: signed?.signedUrl || "",
        size: blob.size,
        mime,
      };
      const { data: inserted, error: insErr } = await supabase.from("cloud_objects").insert(storedObject).select("*").single();
      if (insErr) throw insErr;
      const objectForPreview = { ...inserted, url: signed?.signedUrl || imageDataUrl };
      toast.success(`Imagem gerada e salva na Cloud${data?.provider ? ` · ${data.provider}` : ""}`);
      setPreview({ type: "object", title: objectForPreview.name, object: objectForPreview });
      await refresh();
    } catch (e) {
      toast.error("Falha ao gerar imagem: " + (e?.message || e));
    } finally {
      setGeneratingImage(false);
    }
  };

  const siteUrl = (s) => `${window.location.origin}/s/${s.slug}`;
  const previewTitle = preview?.title || "Pré-visualização";

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
        <div className="flex flex-wrap gap-2">
          <Button onClick={createSite} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
            Publicar site
          </Button>
          <Button type="button" variant="outline" onClick={previewDraft}>
            <Eye className="h-4 w-4 mr-2" />
            Pré-visualizar
          </Button>
        </div>

        <div className="space-y-2">
          {sites.length === 0 && <p className="text-sm text-muted-foreground">Nenhum site ainda.</p>}
          {sites.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground truncate">{siteUrl(s)}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => previewSite(s)} title="Pré-visualizar">
                  <Eye className="h-4 w-4" />
                </Button>
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

      {/* Image generation */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ImageIcon className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold">Gerador de imagens da Cloud</h2>
          <Badge variant="outline" className="ml-auto">Salva em Objetos</Badge>
        </div>
        <Textarea
          rows={3}
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder="Descreva a imagem que deseja criar"
        />
        <Button onClick={generateCloudImage} disabled={generatingImage || busy}>
          {generatingImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
          Gerar imagem
        </Button>
        {imageResult && (
          <div className="overflow-hidden rounded-lg border bg-muted/30">
            <img src={imageResult} alt="Imagem gerada pela Cloud" className="max-h-80 w-full object-contain" />
          </div>
        )}
      </Card>

      {/* Preview */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Eye className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold">Pré-visualização</h2>
          {preview?.url && (
            <Button size="sm" variant="outline" asChild className="ml-auto">
              <a href={preview.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir</a>
            </Button>
          )}
        </div>
        {!preview && <p className="text-sm text-muted-foreground">Clique no ícone de olho em um site/arquivo ou use o botão de pré-visualizar do editor.</p>}
        {preview?.type === "site" && (
          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate font-medium">{previewTitle}</span>
              <RefreshCw className="h-3.5 w-3.5" />
            </div>
            <iframe
              title={previewTitle}
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${previewTitle}</title></head><body>${preview.html || ""}</body></html>`}
              className="h-[520px] w-full border-0 bg-background"
              sandbox="allow-scripts allow-forms allow-popups"
            />
          </div>
        )}
        {preview?.type === "object" && (() => {
          const object = preview.object;
          const isImage = object?.mime?.startsWith("image/");
          const isHtml = object?.mime === "text/html" || object?.name?.toLowerCase().endsWith(".html");
          return (
            <div className="overflow-hidden rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between border-b bg-background px-3 py-2 text-xs text-muted-foreground">
                <span className="truncate font-medium">{object?.name}</span>
                <span>{object?.mime || "arquivo"}</span>
              </div>
              {isImage ? (
                <img src={object.url} alt={object.name} className="max-h-[520px] w-full object-contain" />
              ) : isHtml ? (
                <iframe title={object.name} src={object.url} className="h-[520px] w-full border-0 bg-background" sandbox="allow-scripts allow-forms allow-popups" />
              ) : (
                <div className="p-6 text-sm text-muted-foreground">Prévia direta indisponível para este tipo de arquivo. Use Abrir para visualizar/download.</div>
              )}
            </div>
          );
        })()}
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
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{o.name}</div>
                <div className="text-xs text-muted-foreground">{(o.size / 1024).toFixed(1)} KB · {o.mime || "arquivo"}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => previewObject(o)} title="Pré-visualizar">
                  <Eye className="h-4 w-4" />
                </Button>
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
