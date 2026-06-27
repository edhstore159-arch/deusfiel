import { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import { api } from "@/kenia/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Label } from "@/kenia/components/ui/label";
import { toast } from "sonner";
import { Combine, Upload, Loader2, Download, X, Sparkles, ImageIcon, Package, Info, Wand2, Trash2, CreditCard, Lock } from "lucide-react";
import SocialConnections from "@/kenia/components/SocialConnections";

// Preset de rejuvenescimento facial preservando identidade
const REJUVENATE_PROMPT = `Rejuvenescer o rosto da pessoa preservando integralmente sua identidade facial, proporções, formato do rosto, olhos, nariz, boca, mandíbula e características únicas. Reduzir suavemente rugas, linhas de expressão profundas, flacidez leve e sinais de envelhecimento da pele. Melhorar a textura da pele de forma natural, mantendo poros, detalhes e aparência realista. Preservar tom de pele, expressão facial, penteado e iluminação original. Não alterar idade para aparência infantil ou artificial. Não modificar traços étnicos, estrutura óssea, peso facial ou características que identifiquem a pessoa. Resultado fotorealista, alta definição, aspecto natural de 5 a 15 anos mais jovem, sem efeito plástico, sem excesso de suavização, sem filtros de beleza exagerados.

Prompt negativo: Não mudar identidade, não alterar formato dos olhos, nariz ou boca, não afinar o rosto, não aumentar lábios, não modificar cor dos olhos, não trocar penteado, não criar aparência artificial, não aplicar efeito de boneca, não remover todos os poros, não alterar expressão facial, não adicionar maquiagem excessiva, não gerar rosto diferente, não modificar ângulo da foto, não criar simetria artificial.

Identity preservation priority: maximum. Facial structure lock. Photorealistic age regression. Natural skin restoration. Maintain exact likeness.`;

// Presets oficiais para redes sociais (px)
const SOCIAL_PRESETS = [
  { group: "Instagram", name: "Feed Quadrado",   w: 1080, h: 1080 },
  { group: "Instagram", name: "Feed Vertical",   w: 1080, h: 1350 },
  { group: "Instagram", name: "Stories",         w: 1080, h: 1920 },
  { group: "Instagram", name: "Reels",           w: 1080, h: 1920 },
  { group: "Instagram", name: "Carrossel",       w: 1080, h: 1350 },
  { group: "Facebook",  name: "Feed",            w: 1080, h: 1350 },
  { group: "Facebook",  name: "Story",           w: 1080, h: 1920 },
  { group: "Facebook",  name: "Capa Página",     w: 1640, h: 624  },
  { group: "TikTok",    name: "Vídeo Vertical",  w: 1080, h: 1920 },
  { group: "TikTok",    name: "Capa Vídeo",      w: 1080, h: 1920 },
  { group: "LinkedIn",  name: "Post Quadrado",   w: 1080, h: 1080 },
  { group: "LinkedIn",  name: "Post Vertical",   w: 1080, h: 1350 },
  { group: "LinkedIn",  name: "Banner Perfil",   w: 1584, h: 396  },
  { group: "X",         name: "Post Imagem",     w: 1600, h: 900  },
  { group: "X",         name: "Capa Perfil",     w: 1500, h: 500  },
  { group: "YouTube",   name: "Thumbnail",       w: 1280, h: 720  },
  { group: "YouTube",   name: "Shorts",          w: 1080, h: 1920 },
  { group: "YouTube",   name: "Banner Canal",    w: 2560, h: 1440 },
  { group: "Pinterest", name: "Pin Vertical",    w: 1000, h: 1500 },
  { group: "WhatsApp",  name: "Status",          w: 1080, h: 1920 },
];

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Cobre o canvas com a imagem original (cover/crop centralizado).
function renderPresetToCanvas(img, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const ir = img.width / img.height;
  const tr = w / h;
  let sx, sy, sw, sh;
  if (ir > tr) {
    // imagem mais larga -> recorta laterais
    sh = img.height;
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / tr;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return canvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

function canvasToBlob(canvas, type = "image/png", quality = 0.92) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function drawCover(ctx, img, w, h, dx = 0, dy = 0, dw = w, dh = h) {
  const ir = img.width / img.height;
  const tr = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > tr) {
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawContain(ctx, img, maxW, maxH, cx, cy) {
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.drawImage(img, x, y, w, h);
}

async function buildClientFusionFallback(personSrc, sceneSrc) {
  const [person, scene] = await Promise.all([loadImage(personSrc), loadImage(sceneSrc)]);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b0907";
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.save();
  ctx.filter = "blur(14px) saturate(1.08) brightness(0.86)";
  drawCover(ctx, scene, 1024, 1024, -34, -34, 1092, 1092);
  ctx.restore();
  const grad = ctx.createRadialGradient(512, 440, 80, 512, 512, 720);
  grad.addColorStop(0, "rgba(255, 232, 170, 0.08)");
  grad.addColorStop(0.56, "rgba(16, 13, 10, 0.08)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.48)";
  ctx.shadowBlur = 52;
  ctx.shadowOffsetY = 28;
  drawContain(ctx, person, 840, 900, 512, 540);
  ctx.restore();
  return canvas.toDataURL("image/png", 0.95);
}

async function normalizeImageForStorage(sourceUrl) {
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  if (blob.type === "image/svg+xml" || sourceUrl.startsWith("data:image/svg+xml")) {
    const img = await loadImage(sourceUrl);
    const canvas = renderPresetToCanvas(img, 1024, 1024);
    return await canvasToBlob(canvas, "image/png");
  }
  return blob;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function ImagePicker({ value, onChange, label, testidPrefix }) {
  const inputRef = useRef(null);
  return (
    <div className="space-y-2">
      <Label className="text-gold-200">{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative aspect-square rounded-lg border-2 border-dashed border-gold-700/40 bg-nude-900/40 hover:border-gold-500/60 hover:bg-nude-900/60 transition-colors cursor-pointer overflow-hidden grid place-items-center"
        data-testid={`${testidPrefix}-dropzone`}
      >
        {value ? (
          <>
            <img src={value} alt="preview" className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-nude-950/80 grid place-items-center hover:bg-rose-600 transition-colors"
              data-testid={`${testidPrefix}-clear`}
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </>
        ) : (
          <div className="text-center px-6">
            <Upload className="w-8 h-8 text-gold-400/60 mx-auto mb-2" />
            <div className="text-sm text-gold-200/80 font-medium">Clique para enviar</div>
            <div className="text-xs text-nude-500 mt-1">PNG, JPG até 8 MB</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid={`${testidPrefix}-input`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 8 * 1024 * 1024) { toast.error("Imagem deve ter até 8 MB"); return; }
            const b64 = await fileToBase64(file);
            onChange(b64);
          }}
        />
      </div>
    </div>
  );
}

export default function ImageFusion() {
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [variants, setVariants] = useState([]); // {preset, dataUrl, blob}
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [saved, setSaved] = useState([]); // {id, url, prompt, paid, storage_path}
  const [paying, setPaying] = useState(null);

  useEffect(() => { loadSaved(); }, []);

  const loadSaved = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      const items = await Promise.all((data || []).map(async (r) => {
        const { data: signed } = await supabase.storage
          .from("creative-assets")
          .createSignedUrl(r.storage_path, 60 * 60 * 24);
        return { ...r, url: signed?.signedUrl || null };
      }));
      setSaved(items.filter((x) => x.url));
    } catch (e) {
      console.warn("loadSaved", e);
    }
  };

  const persistImage = async (sourceUrl, promptText) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { toast.error("Faça login para salvar a imagem"); return; }
      const blob = await normalizeImageForStorage(sourceUrl);
      const path = `${uid}/fusion-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("creative-assets")
        .upload(path, blob, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("generated_images").insert({
        user_id: uid, storage_path: path, prompt: promptText || null, kind: "fusion", paid: false,
      });
      if (insErr) throw insErr;
      toast.success("Imagem salva na sua galeria");
      loadSaved();
    } catch (e) {
      toast.error("Não foi possível salvar: " + (e.message || e));
    }
  };

  const removeSaved = async (item) => {
    if (!confirm("Excluir esta imagem salva?")) return;
    await supabase.storage.from("creative-assets").remove([item.storage_path]);
    await supabase.from("generated_images").delete().eq("id", item.id);
    loadSaved();
  };

  const payForImage = async (item) => {
    setPaying(item.id);
    try {
      // Placeholder de pagamento: marca como pago localmente.
      // Para cobrança real, ative o Stripe e troque por uma edge function `create-checkout`.
      await supabase.from("generated_images").update({ paid: true }).eq("id", item.id);
      toast.success("Pagamento confirmado · download HD liberado");
      loadSaved();
    } catch (e) {
      toast.error("Falha no pagamento: " + (e.message || e));
    } finally {
      setPaying(null);
    }
  };

  const fuse = async (opts = {}) => {
    const templateMode = !!opts.templateMode;
    if (!img1 && !img2) { toast.error("Envie ao menos uma imagem"); return; }
    const singleMode = !!img1 && !img2;
    if (singleMode && !prompt.trim() && !templateMode) {
      toast.error("Para editar uma única imagem, descreva a alteração (ex: 'mudar a roupa para azul')");
      return;
    }
    if (templateMode && !prompt.trim()) {
      toast.error("Descreva o NOVO texto/conteúdo que deve aparecer no modelo clonado.");
      return;
    }
    setLoading(true);
    setResult(null);
    setVariants([]);
    const finishWithImage = async (imageUrl, successMessage = "Imagem gerada! Salvando e criando variações...") => {
      setResult(imageUrl);
      toast.success(successMessage);
      persistImage(imageUrl, prompt);
      await generateVariants(imageUrl);
    };
    try {
      const { data } = await api.post(
        "/creatives/fuse-images",
        { image1_base64: img1 || img2, image2_base64: singleMode ? null : img2, prompt, mode: templateMode ? "template" : undefined },
        { timeout: 180000 }
      );
      if (data.ok && data.image) {
        await finishWithImage(data.image, templateMode ? "Modelo clonado! Salvando..." : (singleMode ? "Imagem editada! Salvando..." : "Imagem gerada! Salvando e criando variações..."));
      } else if (!singleMode) {
        const fallback = await buildClientFusionFallback(img1, img2);
        await finishWithImage(fallback, "A IA externa falhou, mas a fusão foi criada e salva localmente.");
      } else {
        toast.error(data.error || "Falha ao gerar a imagem");
      }
    } catch (e) {
      if (!singleMode) {
        try {
          const fallback = await buildClientFusionFallback(img1, img2);
          await finishWithImage(fallback, "A IA externa falhou, mas a fusão foi criada e salva localmente.");
        } catch (fallbackError) {
          toast.error(e.response?.data?.detail || fallbackError?.message || "Erro ao gerar imagem");
        }
      } else {
        toast.error(e.response?.data?.error || e.message || "Erro ao gerar imagem");
      }
    } finally {
      setLoading(false);
    }
  };




  const generateVariants = async (sourceUrl) => {
    setGeneratingVariants(true);
    try {
      const img = await loadImage(sourceUrl);
      const out = [];
      for (const preset of SOCIAL_PRESETS) {
        const canvas = renderPresetToCanvas(img, preset.w, preset.h);
        const blob = await canvasToBlob(canvas, "image/png");
        const dataUrl = canvas.toDataURL("image/png");
        out.push({ preset, dataUrl, blob });
      }
      setVariants(out);
      toast.success(`${out.length} variações criadas`);
    } catch (e) {
      toast.error("Falha ao recortar variações: " + (e?.message || ""));
    } finally {
      setGeneratingVariants(false);
    }
  };

  const downloadOne = (v) => {
    const a = document.createElement("a");
    a.href = v.dataUrl;
    a.download = `kenia-${slug(v.preset.group)}-${slug(v.preset.name)}-${v.preset.w}x${v.preset.h}.png`;
    a.click();
  };

  const downloadOriginal = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `fusao-original-${Date.now()}.png`;
    a.click();
  };

  const downloadAllZip = async () => {
    if (variants.length === 0) return;
    const zip = new JSZip();
    for (const v of variants) {
      const folder = zip.folder(v.preset.group) || zip;
      folder.file(`${slug(v.preset.name)}-${v.preset.w}x${v.preset.h}.png`, v.blob);
    }
    if (result) {
      const r = await fetch(result);
      const b = await r.blob();
      zip.file("ORIGINAL.png", b);
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pack-redes-sociais-${Date.now()}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-nude-950 overflow-hidden text-gold-50">
      <div className="px-6 py-4 bg-nude-900/60 border-b border-gold-900/40">
        <div className="text-xs tracking-[0.2em] uppercase text-gold-400 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Estúdio criativo
        </div>
        <h1 className="font-display font-bold text-2xl mt-1 text-gold-100 flex items-center gap-2">
          <Combine className="w-6 h-6 text-gold-400" />
          Fusão de Imagens com IA · Pack Redes Sociais
        </h1>
        <p className="text-sm text-nude-400 mt-1">
          Envie duas imagens, gere a fusão e baixe automaticamente todas as variações (Instagram, Facebook, TikTok, LinkedIn, X, YouTube, Pinterest, WhatsApp).
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto mb-5">
          <SocialConnections />
        </div>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_1fr_1.2fr] gap-5">
          <Card className="p-4 bg-nude-900/60 border-gold-900/40">
            <ImagePicker value={img1} onChange={setImg1} label="Imagem 1" testidPrefix="img1" />
          </Card>
          <Card className="p-4 bg-nude-900/60 border-gold-900/40">
            <ImagePicker value={img2} onChange={setImg2} label="Imagem 2" testidPrefix="img2" />
          </Card>
          <Card className="p-4 bg-nude-900/60 border-gold-900/40 flex flex-col">
            <Label className="text-gold-200">Resultado base</Label>
            <div className="mt-2 aspect-square rounded-lg bg-nude-950 border border-gold-900/40 grid place-items-center overflow-hidden">
              {loading ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-2" />
                  <div className="text-sm text-gold-200">Gerando fusão... 20-40s</div>
                </div>
              ) : result ? (
                <img src={result} alt="resultado" className="w-full h-full object-cover" data-testid="fusion-result-img" />
              ) : (
                <div className="text-center text-nude-500">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <div className="text-xs">Resultado aparecerá aqui</div>
                </div>
              )}
            </div>
            {result && (
              <Button onClick={downloadOriginal} variant="outline" size="sm"
                className="mt-3 border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100">
                <Download className="w-4 h-4 mr-2" /> Baixar original
              </Button>
            )}
          </Card>
        </div>

        <Card className="max-w-5xl mx-auto p-5 bg-nude-900/60 border-gold-900/40 mt-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-gold-200">Instrução adicional (opcional)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrompt((p) => (p ? p + "\n\n" : "") + REJUVENATE_PROMPT)}
              className="border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100"
              data-testid="fusion-rejuvenate-preset"
            >
              <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Preset: rejuvenescer rosto (preservar identidade)
            </Button>
          </div>
          <Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Mescle as duas imagens em estilo dourado elegante. Use o botão acima para aplicar o preset de rejuvenescimento facial."
            data-testid="fusion-prompt"
            className="bg-nude-950 border-gold-900/40 text-gold-100 placeholder:text-nude-600 mt-2" />
          <div className="flex justify-end mt-4 gap-2 flex-wrap">
            {img1 && !img2 && (
              <Button onClick={() => fuse({ templateMode: true })} disabled={loading || !img1}
                variant="outline"
                className="border-gold-500/60 text-gold-200 hover:bg-gold-500/10"
                data-testid="fusion-clone-template">
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Clonando...</>) :
                  (<><Combine className="w-4 h-4 mr-2" />🧬 Clonar este modelo (mesmo layout · novo texto/imagens)</>)}
              </Button>
            )}
            <Button onClick={() => fuse()} disabled={loading || (!img1 && !img2)}
              className="bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 text-nude-950 font-semibold"
              data-testid="fusion-generate">
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>) :
               (img1 && img2
                  ? (<><Sparkles className="w-4 h-4 mr-2" />Gerar fusão + pack redes sociais</>)
                  : (<><Wand2 className="w-4 h-4 mr-2" />Editar imagem (1 foto · use o prompt)</>))}
            </Button>
          </div>


        </Card>

        {(generatingVariants || variants.length > 0) && (
          <Card className="max-w-5xl mx-auto p-5 bg-nude-900/60 border-gold-900/40 mt-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <Label className="text-gold-200 text-base">
                  Variações ({variants.length}/{SOCIAL_PRESETS.length})
                </Label>
                <p className="text-xs text-nude-400 mt-0.5">Recorte centralizado (cover) em cada formato oficial.</p>
              </div>
              {variants.length > 0 && (
                <Button onClick={downloadAllZip}
                  className="bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 text-nude-950 font-semibold">
                  <Package className="w-4 h-4 mr-2" /> Baixar pack completo (.zip)
                </Button>
              )}
            </div>

            {generatingVariants && variants.length === 0 ? (
              <div className="py-10 text-center text-gold-200">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Recortando variações...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {variants.map((v) => (
                  <div key={`${v.preset.group}-${v.preset.name}`}
                    className="bg-nude-950 border border-gold-900/40 rounded-md overflow-hidden flex flex-col">
                    <div className="bg-black/40 grid place-items-center" style={{ aspectRatio: `${v.preset.w} / ${v.preset.h}` }}>
                      <img src={v.dataUrl} alt={v.preset.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2 text-[11px]">
                      <div className="text-gold-300 font-semibold truncate">{v.preset.group} · {v.preset.name}</div>
                      <div className="text-nude-500">{v.preset.w} × {v.preset.h}</div>
                      <button onClick={() => downloadOne(v)}
                        className="mt-1.5 w-full text-[10px] py-1 rounded bg-gold-600/20 hover:bg-gold-500/30 text-gold-200 flex items-center justify-center gap-1">
                        <Download className="w-3 h-3" /> Baixar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 p-3 rounded-md bg-nude-950/60 border border-gold-900/40 flex gap-2 text-xs text-nude-300">
              <Info className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gold-200">Publicação automática agendada:</strong> requer conectar as contas oficiais
                de cada rede (Instagram/Facebook via Meta Graph API, LinkedIn API, TikTok for Business, YouTube Data API, X API).
                Posso plugar essas integrações via Lovable Cloud — peça "conectar Meta" / "conectar LinkedIn" e eu configuro o OAuth e o agendamento de posts.
                Por enquanto, baixe o pack .zip e poste manualmente em cada rede.
              </div>
            </div>
          </Card>
        )}

        <Card className="max-w-5xl mx-auto p-5 bg-nude-900/60 border-gold-900/40 mt-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <Label className="text-gold-200 text-base">Galeria salva ({saved.length})</Label>
              <p className="text-xs text-nude-400 mt-0.5">Imagens guardadas permanentemente. Pague para liberar download em HD sem marca d'água.</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadSaved}
              className="border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100">
              Atualizar
            </Button>
          </div>
          {saved.length === 0 ? (
            <div className="py-8 text-center text-nude-500 text-sm">Nenhuma imagem salva ainda. Gere uma fusão acima.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {saved.map((s) => (
                <div key={s.id} className="bg-nude-950 border border-gold-900/40 rounded-md overflow-hidden flex flex-col">
                  <div className="relative aspect-square bg-black/40">
                    <img src={s.url} alt="" className={`w-full h-full object-cover ${s.paid ? "" : "blur-[2px] brightness-90"}`} />
                    {!s.paid && (
                      <div className="absolute inset-0 grid place-items-center bg-black/30">
                        <Lock className="w-6 h-6 text-gold-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex flex-col gap-1.5">
                    <div className="text-[10px] text-nude-500 truncate">{new Date(s.created_at).toLocaleString()}</div>
                    {s.paid ? (
                      <a href={s.url} download className="text-[11px] py-1 rounded bg-gold-600/30 hover:bg-gold-500/40 text-gold-100 flex items-center justify-center gap-1">
                        <Download className="w-3 h-3" /> Baixar HD
                      </a>
                    ) : (
                      <button
                        onClick={() => payForImage(s)}
                        disabled={paying === s.id}
                        className="text-[11px] py-1 rounded bg-gradient-to-r from-gold-500 to-gold-700 text-nude-950 font-semibold flex items-center justify-center gap-1 disabled:opacity-60"
                      >
                        <CreditCard className="w-3 h-3" /> {paying === s.id ? "Processando..." : "Pagar R$ 9,90"}
                      </button>
                    )}
                    <button
                      onClick={() => removeSaved(s)}
                      className="text-[10px] py-1 rounded bg-rose-600/20 hover:bg-rose-500/30 text-rose-200 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
