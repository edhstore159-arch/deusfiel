import { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import { api } from "@/kenia/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Label } from "@/kenia/components/ui/label";
import { toast } from "sonner";
import { Combine, Upload, Loader2, Download, X, Sparkles, ImageIcon, Package, Info, Wand2, Trash2, CreditCard, Lock, Camera, RotateCcw } from "lucide-react";


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
const normalizeText = (s = "") => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const INSTAGRAM_STORIES_PRESET = SOCIAL_PRESETS.find((p) => p.group === "Instagram" && p.name === "Stories") || SOCIAL_PRESETS[2];

function detectRequestedPreset(text = "") {
  const t = normalizeText(text);
  if (/\b(1080\s*[x×]\s*1920|9\s*:\s*16|instagram\s*(story|stories|storie|storys|stores)|insta\s*(story|stories|storie|storys|stores)|ig\s*(story|stories|storie|storys|stores)|story|stories|storie|storys|stores|status|reels?)\b/i.test(t)) {
    return INSTAGRAM_STORIES_PRESET;
  }
  if (/\b(1080\s*[x×]\s*1350|4\s*:\s*5|feed\s+vertical|carrossel|carousel)\b/i.test(t)) {
    return SOCIAL_PRESETS.find((p) => p.group === "Instagram" && p.name === "Feed Vertical");
  }
  if (/\b(1080\s*[x×]\s*1080|1\s*:\s*1|feed\s+quadrado|quadrado|square)\b/i.test(t)) {
    return SOCIAL_PRESETS.find((p) => p.group === "Instagram" && p.name === "Feed Quadrado");
  }
  return null;
}

function isPersonReplacementPrompt(text = "") {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /(trocar|troca|mudar|muda|alterar|altera|substituir|substitui|replace|swap|change)\s+([ao]s?\s+)?(foto\s+d[ao]|retrato\s+d[ao]|homem|homen|mulher|pessoa|modelo|personagem|sujeito|criativo\s+para\s+outr[ao]|portrait|photo|man|woman|person|model)|\b(outro\s+homem|outro\s+homen|outra\s+mulher|outra\s+pessoa|novo\s+homem|novo\s+homen|nova\s+mulher|nova\s+pessoa|trocar\s+de\s+pessoa|mudar\s+a\s+pessoa|mudar\s+de\s+pessoa|trocar\s+o\s+criativo\s+de\s+pessoa|replace\s+the\s+person|replace\s+the\s+man|swap\s+person|swap\s+the\s+person)\b/i.test(t);
}

// Detecta: "trocar/usar a imagem do criativo 1 pela do criativo 2, mantendo o rosto do 1"
// (o usuário quer a IMAGEM/CENA do criativo 2 como novo base, mas o ROSTO/identidade continua do criativo 1)
function isCreativeSwapKeepFace(text = "") {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const swap12 = /(trocar|troca|substituir|substitui|usar|use|colocar|coloca|aplicar|aplica|mudar|muda|altera|alterar)\s+(a\s+)?(imagem|foto|cena|fundo|criativo|creative|design|arte|layout)\s+(d[oa]\s+)?(criativo\s*)?1\s+(pel[ao]|por|com|para)\s+(a\s+)?(imagem|foto|cena|fundo|criativo|creative|design|arte|layout)?\s*(d[oa]\s+)?(criativo\s*)?2\b/;
  const useImg2 = /\b(usar|use|colocar|coloca|aplicar|aplica|manter|mantendo)\s+(a\s+)?(imagem|foto|cena|criativo)\s+(d[oa]\s+)?(criativo\s*)?2\b/;
  const keepFace1 = /\b(rosto|face|identidade|cara)\s+(continua|continue|permanece|fica|mantem|mant[eé]m|preservad[ao]|do|da)\s*(sendo\s+)?(d[oa]\s+)?(criativo\s*)?1\b/;
  return swap12.test(t) || (useImg2.test(t) && keepFace1.test(t));
}

// Renderiza no tamanho final oficial. O modo "safe" preserva o criativo inteiro
// e usa um fundo ampliado/desfocado para adaptar sem cortar rosto/texto.
function renderPresetToCanvas(img, w, h, fitMode = "cover") {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const ir = img.width / img.height;
  const tr = w / h;

  if (fitMode === "safe" && Math.abs(ir - tr) > 0.02) {
    ctx.save();
    ctx.filter = "blur(28px)";
    drawCover(ctx, img, w, h, -42, -42, w + 84, h + 84);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, w, h);
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = Math.max(18, Math.round(Math.min(w, h) * 0.018));
    ctx.shadowOffsetY = Math.max(8, Math.round(h * 0.006));
    ctx.drawImage(img, dx, dy, dw, dh);
    return canvas;
  }

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

async function adaptImageToPreset(sourceUrl, preset) {
  const img = await loadImage(sourceUrl);
  const canvas = renderPresetToCanvas(img, preset.w, preset.h, "safe");
  return canvas.toDataURL("image/png");
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
  // Fundo NÍTIDO (sem blur) preservando cores e detalhes reais do cenário
  drawCover(ctx, scene, 1024, 1024, 0, 0, 1024, 1024);
  // Sombra suave sob a pessoa para integrar sem escurecer o cenário
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 24;
  drawContain(ctx, person, 860, 940, 512, 540);
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

function WebcamCaptureDialog({ open, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
      } catch (e) {
        setErr(e?.name === "NotAllowedError" ? "Permissão negada. Libere a câmera nas configurações do navegador." : (e?.message || "Não foi possível acessar a webcam."));
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };
  }, [open]);

  if (!open) return null;
  const snap = () => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 720; c.height = v.videoHeight || 720;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    onCapture(c.toDataURL("image/png"));
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-nude-950 border border-gold-700/40 rounded-lg p-4 max-w-lg w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-gold-100 font-semibold">Tirar foto pela webcam</h3><button onClick={onClose} className="text-nude-400 hover:text-white"><X className="w-4 h-4" /></button></div>
        {err ? <div className="text-rose-400 text-sm">{err}</div> : <video ref={videoRef} autoPlay playsInline muted className="w-full rounded bg-black" />}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="border-gold-700/50 text-gold-200">Cancelar</Button>
          <Button type="button" onClick={snap} disabled={!!err} className="bg-gold-600 hover:bg-gold-500 text-white"><Camera className="w-4 h-4 mr-2" />Capturar</Button>
        </div>
      </div>
    </div>
  );
}

function ImagePicker({ value, onChange, label, testidPrefix }) {
  const inputRef = useRef(null);
  const [camOpen, setCamOpen] = useState(false);
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setCamOpen(true); }}
        className="w-full border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100"
      >
        <Camera className="w-4 h-4 mr-2" /> Tirar foto pela webcam
      </Button>
      <WebcamCaptureDialog open={camOpen} onClose={() => setCamOpen(false)} onCapture={(b64) => onChange(b64)} />
    </div>
  );
}

const PRESETS = [
  { label: "🌍 Trocar país (Paris)", text: "Mantenha a mesma pessoa, mesma roupa, mesma pose e identidade facial. Troque APENAS o cenário ao fundo para Paris, com a Torre Eiffel visível ao fundo, luz natural fotorrealista, sem alterar a pessoa." },
  { label: "🗽 Trocar país (Nova York)", text: "Preserve a pessoa, roupa, pose e identidade facial. Troque APENAS o fundo para uma rua de Nova York (Times Square), iluminação realista, sem modificar a pessoa." },
  { label: "🗾 Trocar país (Tóquio)", text: "Preserve identidade, roupa e pose. Mude APENAS o cenário ao fundo para uma rua de Tóquio com letreiros neon (Shibuya), fotorrealista." },
  { label: "🏖️ Trocar país (Rio - praia)", text: "Preserve a pessoa e identidade facial. Troque APENAS o fundo para a praia de Copacabana com o Pão de Açúcar ao longe, luz dourada de fim de tarde." },
  { label: "💇 Cabelo loiro", text: "Mantenha integralmente o rosto, identidade, pele, roupa e fundo. Altere APENAS a cor do cabelo para loiro natural, preservando o mesmo corte, comprimento, volume e textura. Realista, sem mudar mais nada." },
  { label: "💇 Cabelo ruivo", text: "Mantenha rosto e identidade. Altere APENAS a cor do cabelo para ruivo natural acobreado, mesmo corte e estilo." },
  { label: "💇 Cabelo preto", text: "Mantenha rosto e identidade. Altere APENAS a cor do cabelo para preto natural, preservando o corte." },
  { label: "👁️ Olhos azuis", text: "Mantenha 100% da identidade facial, formato dos olhos, expressão e maquiagem. Altere APENAS a cor da íris para azul natural realista." },
  { label: "👁️ Olhos verdes", text: "Mantenha rosto e identidade. Altere APENAS a cor da íris para verde natural realista." },
  { label: "👁️ Olhos castanhos", text: "Mantenha rosto e identidade. Altere APENAS a cor da íris para castanho natural realista." },
];

function EmergentBalance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("emergent-balance", { body: {} });
      if (error) throw error;
      setData(data);
    } catch (e) {
      setData({ ok: false, error: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  // Exibimos saldo em "Créditos" (1 USD ≈ 10 Créditos). Base de saldo total: 44.44 Créditos.
  const CREDIT_RATE = 10;
  const TOTAL_CREDITS = 44.44;
  const spendUsd = typeof data?.spend === "number" ? data.spend : null;
  const remainingCredits = spendUsd !== null
    ? Math.max(0, TOTAL_CREDITS - spendUsd * CREDIT_RATE)
    : (typeof data?.remaining === "number" ? data.remaining * CREDIT_RATE : null);
  const maxCredits = TOTAL_CREDITS;
  const spentCredits = spendUsd !== null ? spendUsd * CREDIT_RATE : null;
  const fmt = (v) => (typeof v === "number" ? `${v.toFixed(2)} Créditos` : "—");
  const remaining = remainingCredits;
  const max = maxCredits;
  const pct = (typeof remaining === "number" && max > 0)
    ? Math.max(0, Math.min(100, (remaining / max) * 100)) : null;
  const low = typeof remaining === "number" && remaining < 5;
  const dailyBlocked = data?.dailyLimitReached || data?.errorCode === "daily_limit_reached" || /daily[_\s-]?limit|Daily spend limit/i.test(data?.error || data?.errorMessage || "");
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-md bg-nude-950/60 border border-gold-900/40">
      <div className="flex items-center gap-2 text-sm text-gold-200">
        <CreditCard className="w-4 h-4 text-gold-400" />
        <span className="font-semibold">Chave do modelo:</span>
        {loading && !data ? (
          <span className="text-nude-400">carregando...</span>
        ) : dailyBlocked ? (
          <span className="text-amber-300">
            Chave válida, mas o modelo bloqueou por limite diário. Aguarde o reset ou use outra chave com cota disponível.
          </span>
        ) : data?.ok ? (
          <span className={low ? "text-rose-400" : "text-gold-100"}>
            Ainda tem de saldo <b>{fmt(remaining)}</b> de {fmt(max)} (gasto {fmt(spentCredits)})
          </span>
        ) : (
          <span className="text-gold-100">
            Ainda tem de saldo <b>{fmt(max)}</b> de {fmt(max)}
          </span>
        )}
        {pct !== null && (
          <span className="ml-2 inline-block w-32 h-1.5 rounded bg-nude-800 overflow-hidden align-middle">
            <span className={`block h-full ${low ? "bg-rose-500" : "bg-gold-500"}`} style={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}
        className="border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Atualizar"}
      </Button>
    </div>
  );
}


export default function ImageFusion() {
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultPreset, setResultPreset] = useState(null);
  const [variants, setVariants] = useState([]); // {preset, dataUrl, blob}
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [saved, setSaved] = useState([]); // {id, url, prompt, paid, storage_path}
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    loadSaved();
    const sub = supabase.auth.onAuthStateChange(() => { loadSaved(); });
    return () => sub?.data?.subscription?.unsubscribe?.();
  }, []);

  const loadSaved = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setSaved([]); return; }

      // 1. Busca registros da tabela
      const { data: rows } = await supabase
        .from("generated_images")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(120);
      const tablePaths = new Set((rows || []).map((r) => r.storage_path).filter(Boolean));

      // 2. Lista arquivos do storage (recupera órfãos automaticamente)
      const { data: files } = await supabase.storage
        .from("creative-assets")
        .list(uid, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      const storageFiles = (files || []).filter((f) => f.name);
      const storagePaths = new Set(storageFiles.map((f) => `${uid}/${f.name}`));

      // 3. Cria registros para órfãos automaticamente
      const orphanPaths = [...storagePaths].filter((p) => !tablePaths.has(p));
      for (const path of orphanPaths) {
        const fileName = path.split("/").pop() || "";
        const { error: insErr } = await supabase.from("generated_images").insert({
          user_id: uid,
          storage_path: path,
          prompt: fileName.replace(/\.[^.]+$/, "").replace(/^fusion-/i, "").replace(/[_-]/g, " ").trim() || null,
          kind: "fusion",
          paid: false,
        }).maybeSingle();
        if (!insErr) tablePaths.add(path);
      }

      // 4. Gera signed URLs para todos os paths
      const allPaths = [...tablePaths].filter(Boolean);
      const { data: signed } = allPaths.length > 0
        ? await supabase.storage.from("creative-assets").createSignedUrls(allPaths, 60 * 60 * 24 * 7)
        : { data: [] };
      const urlByPath = {};
      (signed || []).forEach((s, i) => { if (s?.signedUrl) urlByPath[allPaths[i]] = s.signedUrl; });

      // 5. Monta lista final: registros da tabela + órfãos do storage
      const fromTable = (rows || []).map((r) => ({ ...r, url: urlByPath[r.storage_path] || null }));
      const fromOrphans = orphanPaths.map((p) => {
        const fileName = p.split("/").pop() || "";
        return {
          id: `orphan-${fileName}`,
          user_id: uid,
          storage_path: p,
          prompt: fileName.replace(/\.[^.]+$/, "").replace(/^fusion-/i, "").replace(/[_-]/g, " ").trim() || null,
          kind: "fusion",
          paid: false,
          url: urlByPath[p] || null,
        };
      });
      setSaved([...fromTable, ...fromOrphans]);
    } catch (e) {
      console.warn("loadSaved", e);
    }
  };

  const persistImage = async (sourceUrl, promptText) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { toast.warning("Faça login para salvar na galeria"); return; }
      if (!sourceUrl) { console.warn("persistImage: sourceUrl vazio"); return; }

      // Converter para blob PNG de forma robusta
      let blob;
      try {
        const img = await loadImage(sourceUrl);
        const canvas = renderPresetToCanvas(img, img.width, img.height);
        blob = await canvasToBlob(canvas, "image/png");
      } catch (canvasErr) {
        console.warn("Canvas fallback:", canvasErr);
        try {
          // Fallback 1: fetch direto
          const resp = await fetch(sourceUrl);
          if (!resp.ok) throw new Error(`fetch failed: ${resp.status}`);
          blob = await resp.blob();
        } catch (fetchErr) {
          console.warn("Fetch fallback:", fetchErr);
          // Fallback 2: converter dataUrl via FileReader
          const dataUrl = sourceUrl.startsWith("data:") ? sourceUrl : `data:image/png;base64,${sourceUrl}`;
          blob = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => {
              const result = fr.result;
              if (!result) return reject(new Error("FileReader retornou vazio"));
              // Converter dataUrl para Blob
              const parts = result.split(",");
              const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
              const b64 = parts[1];
              const byteStr = atob(b64);
              const arr = new Uint8Array(byteStr.length);
              for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
              resolve(new Blob([arr], { type: mime }));
            };
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(dataUrl.startsWith("data:") ? new Blob([dataUrl]) : dataUrl);
          });
        }
      }

      if (!blob || blob.size === 0) {
        toast.error("Não foi possível processar a imagem para salvar");
        return;
      }

      // Upload com retry
      const path = `${uid}/fusion-${Date.now()}-client.png`;
      let upErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await supabase.storage
          .from("creative-assets")
          .upload(path, blob, { contentType: "image/png", upsert: true });
        upErr = result.error;
        if (!upErr) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
      if (upErr) throw new Error("Upload falhou: " + (upErr.message || upErr));

      const { error: insErr } = await supabase.from("generated_images").insert({
        user_id: uid, storage_path: path, prompt: promptText || null, kind: "fusion", paid: false,
      });
      if (insErr) throw new Error("Insert falhou: " + (insErr.message || insErr));

      toast.success("Imagem salva na galeria!");
      await loadSaved();
    } catch (e) {
      console.error("persistImage error:", e);
      toast.error("Falha ao salvar: " + (e.message || e));
    }
  };

  const recoverFromStorage = async () => {
    try {
      toast.loading("Procurando imagens órfãs...", { id: "recover-fusion" });
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { toast.error("Faça login para recuperar", { id: "recover-fusion" }); return; }
      const { data: files, error } = await supabase.storage
        .from("creative-assets")
        .list(uid, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const existingPaths = new Set(saved.map((i) => i.storage_path).filter(Boolean));
      const allPaths = await (async () => {
        const { data: rows } = await supabase
          .from("generated_images")
          .select("storage_path")
          .eq("user_id", uid);
        return new Set((rows || []).map((r) => r.storage_path).filter(Boolean));
      })();
      const orphans = (files || []).filter((f) => f.name && !allPaths.has(`${uid}/${f.name}`));
      if (!orphans.length) { toast.success("Nada a recuperar", { id: "recover-fusion" }); return; }
      let restored = 0;
      for (const f of orphans) {
        const storage_path = `${uid}/${f.name}`;
        const { error: insErr } = await supabase.from("generated_images").insert({
          user_id: uid,
          storage_path,
          prompt: f.name.replace(/\.[^.]+$/, "").replace(/^fusion-/i, "").replace(/[_-]/g, " ").trim() || "Fusão recuperada",
          kind: "fusion",
          paid: false,
        });
        if (!insErr) restored++;
      }
      toast.success(`${restored} imagem(ns) recuperada(s)!`, { id: "recover-fusion" });
      loadSaved();
    } catch (e) {
      toast.error(`Falha ao recuperar: ${e.message || e}`, { id: "recover-fusion" });
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
    const sceneCloneMode = !!opts.sceneCloneMode;
    if (!img1 && !img2) { toast.error("Envie ao menos uma imagem"); return; }
    const singleMode = !!img1 && !img2;
    if (singleMode && !prompt.trim() && !templateMode && !sceneCloneMode) {
      toast.error("Para editar uma única imagem, descreva a alteração (ex: 'mudar a roupa para azul')");
      return;
    }
    if (templateMode && !prompt.trim()) {
      toast.error("Descreva o NOVO texto/conteúdo que deve aparecer no modelo clonado.");
      return;
    }
    setLoading(true);
    setResult(null);
    setResultPreset(null);
    setVariants([]);
    const requestedPreset = detectRequestedPreset(prompt);
    const toDataUrl = async (url) => {
      try {
        const r = await fetch(url);
        const blob = await r.blob();
        return await new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = () => resolve(url);
          fr.readAsDataURL(blob);
        });
      } catch { return url; }
    };

    const finishWithImage = async (imageUrl, successMessage = "Imagem gerada! Salvando e criando variações...") => {
      const stableUrl = await toDataUrl(imageUrl);
      const finalImageUrl = requestedPreset ? await adaptImageToPreset(stableUrl, requestedPreset) : stableUrl;
      setResult(finalImageUrl);
      setResultPreset(requestedPreset || null);
      toast.success(successMessage);
      persistImage(finalImageUrl, prompt);
      await generateVariants(finalImageUrl);
    };
    try {
      const swapKeepFaceMode = !!img1 && !!img2 && !sceneCloneMode && !templateMode && isCreativeSwapKeepFace(prompt);
      const effectiveSceneClone = sceneCloneMode || swapKeepFaceMode;
      const personReplaceMode = !!img1 && !!img2 && !effectiveSceneClone && !templateMode && isPersonReplacementPrompt(prompt);
      const detailTransferMode = !!img1 && !!img2 && !effectiveSceneClone && !templateMode && !personReplaceMode;
      const canUseFusionFallback = !singleMode && !effectiveSceneClone && !detailTransferMode && !personReplaceMode;
      const mode = effectiveSceneClone ? "scene-clone" : (templateMode ? "template" : (singleMode ? "edit" : (personReplaceMode ? "person-replace" : (detailTransferMode ? "detail-transfer" : "fusion"))));

      // Em swapKeepFaceMode: image2 do usuário vira o novo criativo BASE (IMAGE 1 no backend)
      // e image1 do usuário vira a fonte do ROSTO/identidade (IMAGE 2 no backend, esperada pelo scene-clone).
      const payloadImg1 = swapKeepFaceMode ? img2 : (img1 || img2);
      const payloadImg2 = singleMode ? null : (swapKeepFaceMode ? img1 : img2);

      const { data } = await api.post(
        "/creatives/fuse-images",
        {
          image1_base64: payloadImg1,
          image2_base64: payloadImg2,
          prompt,
          mode,
          output_preset: requestedPreset ? { group: requestedPreset.group, name: requestedPreset.name, w: requestedPreset.w, h: requestedPreset.h } : null,
        },
        { timeout: 180000 }
      );
      if (data.ok && data.image) {
        await finishWithImage(data.image, swapKeepFaceMode ? "Criativo trocado para a Imagem 2 mantendo o rosto da Imagem 1! Salvando..." : (sceneCloneMode ? "Cena + look clonados! Salvando..." : (templateMode ? "Modelo clonado! Salvando..." : (singleMode ? "Imagem editada! Salvando..." : (personReplaceMode ? "Pessoa substituída mantendo o criativo original! Salvando..." : (detailTransferMode ? "Detalhes aplicados mantendo o criativo original! Salvando..." : "Imagem gerada! Salvando e criando variações..."))))));
      } else if (canUseFusionFallback) {
        const fallback = await buildClientFusionFallback(img1, img2);
        await finishWithImage(fallback, "A IA externa falhou, mas a fusão foi criada e salva localmente.");
      } else {
        toast.error(data.error || (swapKeepFaceMode ? "Não foi possível trocar o criativo pela Imagem 2 mantendo o rosto da Imagem 1. Tente reformular." : (personReplaceMode ? "Não foi possível substituir a pessoa pela Imagem 2 agora. Tente escrever: trocar o homem da Imagem 1 pelo homem da Imagem 2." : (detailTransferMode ? "Não foi possível aplicar os detalhes mantendo o rosto original. Tente nomear exatamente o detalhe da Imagem 2." : (sceneCloneMode ? "Não foi possível clonar com o rosto da Imagem 2 agora. Tente novamente com fotos mais nítidas." : "Falha ao gerar a imagem")))));
      }
    } catch (e) {
      const personReplaceMode = !!img1 && !!img2 && !sceneCloneMode && !templateMode && isPersonReplacementPrompt(prompt);
      const detailTransferMode = !!img1 && !!img2 && !sceneCloneMode && !templateMode && !personReplaceMode;
      const canUseFusionFallback = !singleMode && !sceneCloneMode && !detailTransferMode && !personReplaceMode;
      if (canUseFusionFallback) {
        try {
          const fallback = await buildClientFusionFallback(img1, img2);
          await finishWithImage(fallback, "A IA externa falhou, mas a fusão foi criada e salva localmente.");
        } catch (fallbackError) {
          toast.error(e.response?.data?.detail || fallbackError?.message || "Erro ao gerar imagem");
        }
      } else {
        toast.error(e.response?.data?.error || e.message || (personReplaceMode ? "Erro ao substituir a pessoa usando a Imagem 2" : (detailTransferMode ? "Erro ao aplicar detalhes preservando o criativo original" : (sceneCloneMode ? "Erro ao clonar cena com rosto da Imagem 2" : "Erro ao gerar imagem"))));
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
        const canvas = renderPresetToCanvas(img, preset.w, preset.h, "safe");
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
    a.download = resultPreset
      ? `fusao-${slug(resultPreset.group)}-${slug(resultPreset.name)}-${resultPreset.w}x${resultPreset.h}-${Date.now()}.png`
      : `fusao-original-${Date.now()}.png`;
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
          Edição de Imagens com IA · Pack Redes Sociais
        </h1>
        <p className="text-sm text-nude-400 mt-1">
          Envie a Imagem 1 como criativo original. A Imagem 2 pode servir como referência de detalhes ou como a pessoa substituta quando você pedir troca de homem/mulher/pessoa.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_1fr_1.2fr] gap-5">
          <Card className="p-4 bg-nude-900/60 border-gold-900/40">
            <ImagePicker value={img1} onChange={setImg1} label="Imagem 1 · criativo original" testidPrefix="img1" />
          </Card>
          <Card className="p-4 bg-nude-900/60 border-gold-900/40">
            <ImagePicker value={img2} onChange={setImg2} label="Imagem 2 · detalhes ou pessoa substituta" testidPrefix="img2" />
          </Card>
          <Card className="p-4 bg-nude-900/60 border-gold-900/40 flex flex-col">
            <Label className="text-gold-200">Resultado base</Label>
            <div className="mt-2 rounded-lg bg-nude-950 border border-gold-900/40 grid place-items-center overflow-hidden" style={{ aspectRatio: resultPreset ? `${resultPreset.w} / ${resultPreset.h}` : "1 / 1" }}>
              {loading ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-2" />
                  <div className="text-sm text-gold-200">Gerando fusão em alta resolução... 20-40s</div>
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
                  <Download className="w-4 h-4 mr-2" /> {resultPreset ? `Baixar ${resultPreset.name} HD` : "Baixar original"}
              </Button>
            )}
          </Card>
        </div>

        <Card className="max-w-5xl mx-auto p-5 bg-nude-900/60 border-gold-900/40 mt-5">
          <EmergentBalance />
          <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
            <Label className="text-gold-200">Instrução adicional (opcional)</Label>
          </div>
          <div className="mt-3 rounded-md border border-gold-500/50 bg-gold-500/10 p-3">
            <Button onClick={() => fuse({ sceneCloneMode: true })} disabled={loading || !img1 || !img2}
              variant="outline"
              className="w-full min-h-12 justify-center border-gold-500/70 bg-nude-950/70 text-gold-100 hover:bg-gold-500/10 hover:text-gold-50"
              data-testid="fusion-clone-scene-primary">
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Clonando cena...</>) :
                (<><Combine className="w-4 h-4 mr-2" />🎬 Clonar cena + look da Imagem 1 (rosto da Imagem 2)</>)}
            </Button>
            <p className="mt-2 text-xs text-nude-400 text-center">
              Envie a Imagem 1 com a cena/look original e a Imagem 2 com o rosto/pessoa que será aplicado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button type="button" variant="outline" size="sm"
              onClick={() => setPrompt((p) => (p ? p + "\n\n" : "") + REJUVENATE_PROMPT)}
              className="border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100"
              data-testid="fusion-rejuvenate-preset">
              <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Rejuvenescer rosto
            </Button>
            {PRESETS.map((p) => (
              <Button key={p.label} type="button" variant="outline" size="sm"
                onClick={() => setPrompt((cur) => (cur ? cur + "\n\n" : "") + p.text)}
                className="border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100">
                {p.label}
              </Button>
            ))}
          </div>
          <Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: trocar o homem da Imagem 1 pelo homem da Imagem 2; usar apenas os óculos da Imagem 2; remover o colar; trocar só o fundo."
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
                    ? (<><Sparkles className="w-4 h-4 mr-2" />Aplicar Imagem 2 no criativo + pack</>)
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
                <p className="text-xs text-nude-400 mt-0.5">Adaptação em alta resolução para cada formato oficial, preservando o criativo sem cortar rosto/texto.</p>
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
              <p className="text-xs text-nude-400 mt-0.5">Imagens guardadas permanentemente. Download HD liberado.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={recoverFromStorage}
                className="border-sky-700/50 text-sky-300 hover:bg-sky-500/10 hover:text-sky-200">
                <RotateCcw className="w-3 h-3 mr-1" /> Recuperar imagens órfãs
              </Button>
              <Button variant="outline" size="sm" onClick={loadSaved}
                className="border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100">
                Atualizar
              </Button>
            </div>
          </div>
            {saved.length === 0 ? (
              <div className="py-8 text-center text-nude-500 text-sm">Nenhuma imagem salva ainda. Gere uma fusão acima.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {saved.map((s) => (
                  <div key={s.id} className="bg-nude-950 border border-gold-900/40 rounded-md overflow-hidden flex flex-col">
                    <div className="relative aspect-square bg-black/40">
                      {s.url ? (
                        <img
                          src={s.url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const placeholder = e.currentTarget.nextElementSibling;
                            if (placeholder) placeholder.style.display = "grid";
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full grid place-items-center text-nude-500 text-xs"
                        style={{ display: s.url ? "none" : "grid" }}
                      >
                        Imagem indisponível
                      </div>
                    </div>
                    <div className="p-2 flex flex-col gap-1.5">
                      <div className="text-[10px] text-nude-500 truncate">{s.created_at ? new Date(s.created_at).toLocaleString() : "Salva"}</div>
                      {s.url ? (
                        <a href={s.url} download target="_blank" rel="noreferrer" className="text-[11px] py-1 rounded bg-gold-600/30 hover:bg-gold-500/40 text-gold-100 flex items-center justify-center gap-1">
                          <Download className="w-3 h-3" /> Baixar HD
                        </a>
                      ) : (
                        <div className="text-[10px] py-1 rounded bg-nude-800 text-nude-500 text-center">Indisponível</div>
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
