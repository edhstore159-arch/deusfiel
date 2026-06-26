import { useMemo, useRef, useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { toast } from "sonner";
import { Clapperboard, Copy, Download, Film, Loader2, Sparkles, Wand2 } from "lucide-react";

const CATEGORIES = {
  dramatico: {
    label: "História dramática",
    action: "a young person walks alone through a dark Brazilian city street at night, neon reflections on wet pavement, they slowly notice something important and look up with intense emotion",
    mood: "suspenseful, emotional, tense",
  },
  narrativa: {
    label: "Narração / reação",
    action: "a person in an urban Brazilian environment reacts to unexpected news, facial expression changing from surprise to determination while the camera gradually pushes closer",
    mood: "dramatic, attention-grabbing, expressive",
  },
  motivacional: {
    label: "Motivacional épico",
    action: "a person stands on a rooftop looking over the city skyline at sunrise, breathing deeply and turning toward the golden light with renewed confidence",
    mood: "inspiring, cinematic, hopeful",
  },
  humor: {
    label: "Humor / absurdo",
    action: "a surprised person in a bright Brazilian street notices an absurd everyday situation and reacts with exaggerated comedic facial expression while the camera makes a quick push-in",
    mood: "funny, energetic, absurd, viral",
  },
};

const BASE_STYLE = [
  "Cinematic 9:16 vertical video, single continuous shot, no cuts, no scene transitions, no split-screen, no text overlays.",
  "Hyper-realistic 4K look, Brazilian urban street aesthetic, dramatic high-contrast lighting, natural color grading, subtle film grain, realistic skin texture, anatomically correct human faces with alive expressive eyes.",
  "Handheld camera feel with one smooth gradual zoom-in, strong emotional storytelling, high-end production quality.",
].join(" ");

const NEGATIVE = "Avoid: fast cuts, multiple scenes, visible captions, watermarks, logos, distorted faces, dead eyes, melted features, extra fingers, deformed hands, low resolution, cartoon style, fruit mixed with human body parts, objects fused with fingers, anthropomorphic fruit.";

function buildPrompt(category, customScene) {
  const selected = CATEGORIES[category] || CATEGORIES.dramatico;
  const action = customScene?.trim() || selected.action;
  return `${BASE_STYLE} Scene: ${action}. Mood: ${selected.mood}. Camera: vertical smartphone cinematic framing, continuous handheld movement, slow motion accents, shallow depth of field, realistic environment. If the scene contains fruit/object/product, keep it standalone and never merge it with human anatomy. ${NEGATIVE}`;
}

const splitLines = (text, max = 30) => {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 5);
};

function drawVideoFrame(ctx, frame, totalFrames, width, height, title, category, scene) {
  const t = frame / Math.max(1, totalFrames);
  const selected = CATEGORIES[category] || CATEGORIES.dramatico;
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, category === "motivacional" ? "#3a2609" : "#100f0d");
  bg.addColorStop(0.52, category === "humor" ? "#47320d" : "#201713");
  bg.addColorStop(1, "#0b0a09");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glowX = width * (0.25 + 0.5 * t);
  const glowY = height * (0.25 + 0.08 * Math.sin(t * Math.PI * 2));
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, width * 0.75);
  glow.addColorStop(0, "rgba(214, 165, 74, 0.38)");
  glow.addColorStop(0.45, "rgba(123, 80, 32, 0.18)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-0.15 + t * 0.12);
  for (let i = -5; i < 7; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(255, 224, 170, 0.075)" : "rgba(255, 255, 255, 0.035)";
    ctx.fillRect(i * 140 - 80 + t * 90, -height, 34, height * 2);
  }
  ctx.restore();

  ctx.fillStyle = "rgba(255, 245, 218, 0.88)";
  ctx.font = "700 48px Arial, sans-serif";
  ctx.textAlign = "center";
  splitLines(title || "Vídeo viral", 19).forEach((line, i) => {
    ctx.fillText(line.toUpperCase(), width / 2, 210 + i * 58);
  });

  ctx.fillStyle = "rgba(214, 165, 74, 0.94)";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillText(selected.label.toUpperCase(), width / 2, 420);

  const cardY = 505 + Math.sin(t * Math.PI) * -16;
  ctx.fillStyle = "rgba(255, 245, 218, 0.08)";
  ctx.strokeStyle = "rgba(214, 165, 74, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(64, cardY, width - 128, 450, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 245, 218, 0.92)";
  ctx.font = "400 32px Arial, sans-serif";
  ctx.textAlign = "left";
  splitLines(scene || selected.action, 31).forEach((line, i) => {
    ctx.fillText(line, 104, cardY + 88 + i * 48);
  });

  ctx.fillStyle = "rgba(214, 165, 74, 0.88)";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.fillText("ROSTOS REALISTAS • OBJETOS SEPARADOS", 104, cardY + 380);

  const progress = width * t;
  ctx.fillStyle = "rgba(214, 165, 74, 0.94)";
  ctx.fillRect(0, height - 18, progress, 18);
}

export default function ViralVideoStudio() {
  const [category, setCategory] = useState("dramatico");
  const [customScene, setCustomScene] = useState("");
  const [title, setTitle] = useState("Vídeo viral jurídico / storytelling");
  const [videoUrl, setVideoUrl] = useState("");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const lastVideoUrl = useRef("");

  const prompt = useMemo(() => buildPrompt(category, customScene), [category, customScene]);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copiado");
  };

  const applyPreset = (key) => {
    setCategory(key);
    setCustomScene(CATEGORIES[key].action);
  };

  const generateVideo = async () => {
    if (generatingVideo) return;
    setGeneratingVideo(true);
    try {
      if (lastVideoUrl.current) URL.revokeObjectURL(lastVideoUrl.current);
      const width = 720;
      const height = 1280;
      const fps = 30;
      const seconds = 6;
      const totalFrames = fps * seconds;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx || !canvas.captureStream || typeof MediaRecorder === "undefined") {
        throw new Error("Seu navegador não suporta geração de vídeo local");
      }
      const stream = canvas.captureStream(fps);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.start();
      for (let frame = 0; frame <= totalFrames; frame += 1) {
        drawVideoFrame(ctx, frame, totalFrames, width, height, title, category, customScene);
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
      }
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
      await stopped;
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      lastVideoUrl.current = url;
      setVideoUrl(url);
      toast.success("Vídeo gerado e pronto para baixar");
    } catch (error) {
      toast.error(error?.message || "Não foi possível gerar o vídeo");
    } finally {
      setGeneratingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-nude-950 text-gold-50">
      <div className="px-6 py-4 bg-nude-900/60 border-b border-gold-900/40">
        <div className="text-xs tracking-[0.2em] uppercase text-gold-400 font-semibold flex items-center gap-1.5">
          <Film className="w-3 h-3" /> Estúdio criativo
        </div>
        <h1 className="font-display font-bold text-2xl mt-1 text-gold-100 flex items-center gap-2">
          <Clapperboard className="w-6 h-6 text-gold-400" /> Vídeos Virais 9:16
        </h1>
        <p className="text-sm text-nude-400 mt-1">
          Prompts corrigidos para IA de vídeo em tomada única, com estética cinematográfica brasileira para Shorts, Reels e TikTok.
        </p>
      </div>

      <div className="p-6 overflow-auto">
        <div className="max-w-6xl mx-auto grid xl:grid-cols-[1fr_0.9fr] gap-5">
          <Card className="p-5 bg-nude-900/60 border-gold-900/40 space-y-5">
            <div className="grid md:grid-cols-[1fr_220px] gap-4">
              <div className="space-y-2">
                <Label className="text-gold-200">Título interno</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-nude-950 border-gold-900/40 text-gold-100 placeholder:text-nude-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gold-200">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-nude-950 border-gold-900/40 text-gold-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, item]) => (
                      <SelectItem key={key} value={key}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(CATEGORIES).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`text-left rounded-md border px-3 py-3 transition-colors ${category === key ? "border-gold-500 bg-gold-500/10 text-gold-100" : "border-gold-900/40 bg-nude-950/70 text-nude-300 hover:border-gold-700/70"}`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs text-nude-500 mt-1 line-clamp-2">{item.mood}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-gold-200">Cena principal</Label>
              <Textarea
                rows={5}
                value={customScene}
                onChange={(e) => setCustomScene(e.target.value)}
                placeholder="Descreva a cena principal em uma única tomada contínua."
                className="bg-nude-950 border-gold-900/40 text-gold-100 placeholder:text-nude-600"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={copyPrompt}
                variant="outline"
                className="border-gold-700/60 bg-nude-950 text-gold-100 hover:bg-gold-500/10"
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar prompt final
              </Button>
              <Button
                onClick={generateVideo}
                disabled={generatingVideo}
                className="bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 text-nude-950 font-semibold"
              >
                {generatingVideo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Film className="w-4 h-4 mr-2" />}
                {generatingVideo ? "Gerando vídeo..." : "Gerar vídeo"}
              </Button>
            </div>
          </Card>

          <Card className="p-5 bg-nude-900/60 border-gold-900/40 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <Label className="text-gold-200 text-base">Prompt final otimizado</Label>
            </div>
            <div className="rounded-lg border border-gold-900/40 bg-nude-950 p-4 text-sm leading-relaxed text-gold-100 whitespace-pre-wrap flex-1 min-h-[360px]">
              {prompt}
            </div>
            <div className="mt-4 rounded-md border border-gold-900/40 bg-gold-500/10 p-3 text-xs text-nude-300 flex gap-2">
              <Wand2 className="w-4 h-4 text-gold-400 shrink-0" />
              <span>O texto evita cortes rápidos, corrige rostos deformados e impede fruta/objeto misturado com corpo humano.</span>
            </div>
            {videoUrl && (
              <div className="mt-4 space-y-3">
                <video src={videoUrl} controls className="mx-auto max-h-[520px] w-full max-w-[300px] rounded-lg border border-gold-900/40 bg-nude-950" />
                <a href={videoUrl} download="video-viral-kenia.webm" className="block">
                  <Button className="w-full bg-gold-600 hover:bg-gold-500 text-nude-950 font-semibold">
                    <Download className="w-4 h-4 mr-2" /> Baixar vídeo
                  </Button>
                </a>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}