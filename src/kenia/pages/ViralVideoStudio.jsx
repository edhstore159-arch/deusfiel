import { useMemo, useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { toast } from "sonner";
import { Clapperboard, Copy, Film, Sparkles, Wand2 } from "lucide-react";

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
  "Hyper-realistic 4K look, Brazilian urban street aesthetic, dramatic high-contrast lighting, teal and orange color grading, subtle film grain, realistic skin texture.",
  "Handheld camera feel with one smooth gradual zoom-in, strong emotional storytelling, high-end production quality.",
].join(" ");

const NEGATIVE = "Avoid: fast cuts, multiple scenes, visible captions, watermarks, logos, distorted faces, extra fingers, deformed hands, low resolution, cartoon style.";

function buildPrompt(category, customScene) {
  const selected = CATEGORIES[category] || CATEGORIES.dramatico;
  const action = customScene?.trim() || selected.action;
  return `${BASE_STYLE} Scene: ${action}. Mood: ${selected.mood}. Camera: vertical smartphone cinematic framing, continuous handheld movement, slow motion accents, shallow depth of field, realistic environment. ${NEGATIVE}`;
}

export default function ViralVideoStudio() {
  const [category, setCategory] = useState("dramatico");
  const [customScene, setCustomScene] = useState("");
  const [title, setTitle] = useState("Vídeo viral jurídico / storytelling");

  const prompt = useMemo(() => buildPrompt(category, customScene), [category, customScene]);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copiado");
  };

  const applyPreset = (key) => {
    setCategory(key);
    setCustomScene(CATEGORIES[key].action);
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

            <div className="flex justify-end">
              <Button
                onClick={copyPrompt}
                className="bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 text-nude-950 font-semibold"
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar prompt final
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
              <span>O texto evita cortes rápidos e múltiplas cenas para a IA entender como uma única tomada cinematográfica.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}