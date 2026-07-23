import { useMemo, useRef, useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  pessoas: {
    label: "Pessoas falando",
    action: "two realistic people in a Brazilian office conversation smile naturally, one person talks with visible mouth movement and warm facial expressions while the camera slowly moves closer",
    mood: "human, natural, expressive, conversational",
  },
  objetos: {
    label: "Objetos em movimento",
    action: "several well-defined objects move through a cinematic tabletop scene, fruit, phone, documents, car miniature and office items gliding independently without any human body fusion",
    mood: "dynamic, precise, clean object motion",
  },
};

const BASE_STYLE = [
  "Cinematic 9:16 vertical video, single continuous shot, no cuts, no scene transitions, no split-screen, no text overlays.",
  "Hyper-realistic 4K look, Brazilian urban street aesthetic, dramatic high-contrast lighting, natural color grading, subtle film grain, realistic skin texture, anatomically correct human faces with alive expressive eyes.",
  "Show real continuous motion: people can talk, smile and react with natural mouth movement; objects can move independently with clear edges and no body fusion.",
  "Handheld camera feel with one smooth gradual zoom-in, strong emotional storytelling, high-end production quality.",
].join(" ");

const NEGATIVE = "Avoid: fast cuts, hard scene changes, visible captions, watermarks, logos, distorted faces, dead eyes, melted features, extra fingers, deformed hands, low resolution, cartoon style, fruit mixed with human body parts, objects fused with fingers. Only make an anthropomorphic object if explicitly requested, such as fruit with a human face.";

function buildPrompt(category, customScene, durationSeconds) {
  const selected = CATEGORIES[category] || CATEGORIES.dramatico;
  const action = customScene?.trim() || selected.action;
  return `${BASE_STYLE} Duration: ${durationSeconds} seconds. Scene: ${action}. Mood: ${selected.mood}. Camera: vertical smartphone cinematic framing, continuous handheld movement, slow motion accents, shallow depth of field, realistic environment. If the scene contains fruit/object/product, keep it standalone and never merge it with human anatomy unless the user explicitly asks for a human face on the object. ${NEGATIVE}`;
}

// Veo (Emergent) prefers a single continuous-shot description in English with
// concrete camera, subject, action, environment, lighting and lens details.
// We wrap the user scene with strong cinematographic guidance so the model
// reliably generates a 9:16 vertical clip instead of failing or rendering text cards.
function buildVeoPrompt(basePrompt, category, customScene, seconds) {
  const selected = CATEGORIES[category] || CATEGORIES.dramatico;
  const action = (customScene || "").trim() || selected.action;
  const mood = selected.mood;
  const lines = [
    `Cinematic vertical 9:16 video, single continuous take (no cuts, no transitions, no split-screen, no on-screen text), approximately ${seconds} seconds long.`,
    `Subject and action: ${action}.`,
    `Mood: ${mood}.`,
    `Camera: handheld smartphone-style cinematography, slow gradual push-in, shallow depth of field, 35mm lens look, eye-level framing for people / tabletop angle for objects.`,
    `Lighting: dramatic high-contrast natural light with warm highlights and soft shadows, subtle film grain, realistic color grading.`,
    `Realism: hyper-realistic 4K, anatomically correct human faces with alive expressive eyes, natural lip movement when speaking, real physical motion of objects with clean edges (no morphing between people and objects unless explicitly described).`,
    `Audio context (visual only — model does not need to synthesize sound): natural ambient environment.`,
    `Avoid: fast cuts, captions, watermarks, logos, deformed hands, extra fingers, melted faces, dead eyes, cartoon style (unless category is cartoon), text overlays.`,
    `Reference style brief: ${basePrompt}`,
  ];
  return lines.join(" ");
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

const clampDuration = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(300, Math.max(6, parsed));
};

const hasAny = (text, words) => words.some((word) => text.includes(word));

function detectSceneMode(category, scene) {
  const text = `${category} ${scene || ""}`.toLowerCase();
  const people = hasAny(text, ["pessoa", "homem", "mulher", "cliente", "advogada", "falando", "sorrindo", "rosto", "face", "conversa"]);
  const objects = hasAny(text, ["objeto", "fruta", "maç", "mac", "carro", "telefone", "celular", "documento", "livro", "mesa", "produto"]);
  if (category === "objetos") return "objects";
  if (category === "pessoas") return objects ? "mixed" : "people";
  if (people && objects) return "mixed";
  if (objects) return "objects";
  if (people) return "people";
  return "mixed";
}

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPerson(ctx, x, y, scale, t, speaking = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const talk = speaking ? Math.abs(Math.sin(t * Math.PI * 18)) : 0.25;
  const smile = 0.45 + Math.abs(Math.sin(t * Math.PI * 3)) * 0.35;

  ctx.fillStyle = "rgba(24, 17, 13, 0.46)";
  ctx.beginPath();
  ctx.ellipse(0, 190, 118, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  const jacket = ctx.createLinearGradient(-95, 80, 95, 260);
  jacket.addColorStop(0, "#5b3b19");
  jacket.addColorStop(1, "#17110e");
  ctx.fillStyle = jacket;
  roundedRect(ctx, -86, 64, 172, 178, 58);
  ctx.fill();

  ctx.fillStyle = "#f0c7a2";
  ctx.beginPath();
  ctx.ellipse(0, 0, 70, 82, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a1710";
  ctx.beginPath();
  ctx.ellipse(0, -62, 74, 42, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-62, -62, 124, 24);

  ctx.fillStyle = "#20120e";
  ctx.beginPath();
  ctx.ellipse(-25, -8, 7, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(25, -8, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(86, 44, 28, 0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(-8, 21, 3, 31);
  ctx.stroke();

  ctx.strokeStyle = "#7e3328";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-30, 42);
  ctx.quadraticCurveTo(0, 42 + 34 * smile + 18 * talk, 32, 42);
  ctx.stroke();
  if (speaking) {
    ctx.fillStyle = "rgba(96, 31, 28, 0.88)";
    ctx.beginPath();
    ctx.ellipse(0, 48, 18 + talk * 6, 5 + talk * 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(235, 128, 103, 0.26)";
  ctx.beginPath();
  ctx.ellipse(-42, 25, 14, 7, -0.2, 0, Math.PI * 2);
  ctx.ellipse(42, 25, 14, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObject(ctx, type, x, y, size, t, index = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * Math.PI * 2 + index) * 18);
  ctx.rotate(Math.sin(t * Math.PI * 2 + index) * 0.14);
  const s = size / 100;
  ctx.scale(s, s);
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 16;

  if (type === "apple") {
    const apple = ctx.createRadialGradient(-22, -26, 10, 0, 0, 78);
    apple.addColorStop(0, "#ff8775");
    apple.addColorStop(0.55, "#c62622");
    apple.addColorStop(1, "#6d1111");
    ctx.fillStyle = apple;
    ctx.beginPath();
    ctx.ellipse(-26, 10, 48, 62, -0.18, 0, Math.PI * 2);
    ctx.ellipse(26, 10, 48, 62, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#51301a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.quadraticCurveTo(18, -84, 43, -74);
    ctx.stroke();
    ctx.fillStyle = "#4d8b36";
    ctx.beginPath();
    ctx.ellipse(42, -70, 27, 12, -0.34, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "car") {
    ctx.fillStyle = "#d9a548";
    roundedRect(ctx, -78, -22, 156, 58, 16);
    ctx.fill();
    ctx.fillStyle = "#5e3517";
    roundedRect(ctx, -43, -58, 86, 44, 14);
    ctx.fill();
    ctx.fillStyle = "#11100f";
    [-48, 48].forEach((wheel) => {
      ctx.beginPath();
      ctx.arc(wheel, 38, 18, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === "phone") {
    ctx.fillStyle = "#1d1713";
    roundedRect(ctx, -38, -72, 76, 144, 16);
    ctx.fill();
    ctx.fillStyle = "#d6a54a";
    roundedRect(ctx, -28, -56, 56, 108, 9);
    ctx.fill();
  } else if (type === "document") {
    ctx.fillStyle = "#f7ead0";
    roundedRect(ctx, -54, -72, 108, 144, 8);
    ctx.fill();
    ctx.strokeStyle = "#7b5020";
    ctx.lineWidth = 5;
    [-34, -10, 16, 42].forEach((line) => {
      ctx.beginPath();
      ctx.moveTo(-32, line);
      ctx.lineTo(34, line);
      ctx.stroke();
    });
  } else {
    const box = ctx.createLinearGradient(-65, -65, 65, 65);
    box.addColorStop(0, "#f2c66a");
    box.addColorStop(1, "#6a3e18");
    ctx.fillStyle = box;
    roundedRect(ctx, -62, -62, 124, 124, 20);
    ctx.fill();
  }
  ctx.restore();
}

function drawCinematicObjects(ctx, width, height, t, scene) {
  const text = String(scene || "").toLowerCase();
  const types = [
    hasAny(text, ["maç", "mac", "fruta"]) ? "apple" : "object",
    hasAny(text, ["carro", "veiculo", "veículo"]) ? "car" : "document",
    hasAny(text, ["telefone", "celular", "whatsapp"]) ? "phone" : "car",
    "object",
  ];
  types.forEach((type, i) => {
    const path = (t + i * 0.18) % 1;
    const x = -120 + path * (width + 240);
    const y = 650 + i * 116 + Math.sin(t * Math.PI * 4 + i) * 34;
    drawObject(ctx, type, x, y, i === 0 ? 122 : 94, t, i);
  });
}

// ============ CARTOON / HEYGEN-LIKE MODE ============
const CARTOON_PALETTES = [
  { sky1: "#ffd1a8", sky2: "#ff8fa3", ground: "#3d2a6b", accent: "#ffe066" },
  { sky1: "#a8e0ff", sky2: "#5b8def", ground: "#1f2b6b", accent: "#ffd166" },
  { sky1: "#ffe5b4", sky2: "#f78ca0", ground: "#2a1b4a", accent: "#9bf6ff" },
  { sky1: "#caffbf", sky2: "#9bf6ff", ground: "#073b4c", accent: "#ffd166" },
  { sky1: "#ffadad", sky2: "#bdb2ff", ground: "#1a1a40", accent: "#caffbf" },
];

function drawCartoonScenery(ctx, w, h, t, palette) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, palette.sky1);
  sky.addColorStop(1, palette.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // sun
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.18 + Math.sin(t * Math.PI * 2) * 8, w * 0.11, 0, Math.PI * 2);
  ctx.fill();
  // clouds
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 220 + t * 80) % (w + 240)) - 120;
    const cy = 140 + i * 70;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.arc(cx + 38, cy + 6, 30, 0, Math.PI * 2);
    ctx.arc(cx - 36, cy + 8, 28, 0, Math.PI * 2);
    ctx.fill();
  }
  // ground
  ctx.fillStyle = palette.ground;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  for (let x = 0; x <= w; x += 30) {
    ctx.lineTo(x, h * 0.72 + Math.sin(x * 0.02 + t * 2) * 10);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  // hills
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.arc(w * 0.25, h * 0.72, 180, Math.PI, 0);
  ctx.arc(w * 0.7, h * 0.72, 140, Math.PI, 0);
  ctx.fill();
}

function drawCartoonCharacter(ctx, x, y, scale, t, palette, speaking = true, skin = "#ffd9b3", hair = "#2a1810", shirt = "#ef476f") {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * Math.PI * 4) * 6;
  ctx.translate(0, bob);
  ctx.scale(scale, scale);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 210, 110, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = shirt;
  roundedRect(ctx, -80, 70, 160, 170, 40);
  ctx.fill();
  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(-16, 50, 32, 30);
  // head
  ctx.beginPath();
  ctx.arc(0, 0, 78, 0, Math.PI * 2);
  ctx.fill();
  // hair
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -10, 78, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillRect(-78, -20, 30, 50);
  ctx.fillRect(48, -20, 30, 50);
  // eyes (blink)
  const blink = Math.sin(t * Math.PI * 1.2) > 0.97 ? 0.1 : 1;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-26, 4, 13, 16 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(26, 4, 13, 16 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(-26 + Math.sin(t * 2) * 2, 6, 6 * blink, 0, Math.PI * 2);
  ctx.arc(26 + Math.sin(t * 2) * 2, 6, 6 * blink, 0, Math.PI * 2);
  ctx.fill();
  // eyebrows
  ctx.strokeStyle = hair;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-38, -18); ctx.lineTo(-14, -22);
  ctx.moveTo(14, -22); ctx.lineTo(38, -18);
  ctx.stroke();
  // cheeks
  ctx.fillStyle = "rgba(239,71,111,0.35)";
  ctx.beginPath();
  ctx.arc(-40, 30, 12, 0, Math.PI * 2);
  ctx.arc(40, 30, 12, 0, Math.PI * 2);
  ctx.fill();
  // mouth (speaking)
  const mouthOpen = speaking ? 6 + Math.abs(Math.sin(t * Math.PI * 14)) * 18 : 4;
  ctx.fillStyle = "#3d1a1a";
  ctx.beginPath();
  ctx.ellipse(0, 42, 20, mouthOpen, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff8fa3";
  ctx.beginPath();
  ctx.ellipse(0, 46, 12, mouthOpen * 0.5, 0, 0, Math.PI);
  ctx.fill();
  // arms wave
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  const wave = Math.sin(t * Math.PI * 3) * 0.4;
  ctx.beginPath();
  ctx.moveTo(-70, 110);
  ctx.lineTo(-110 + wave * 20, 180 - wave * 30);
  ctx.moveTo(70, 110);
  ctx.lineTo(110 - wave * 20, 180 + wave * 30);
  ctx.stroke();
  // hands
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(-110 + wave * 20, 180 - wave * 30, 14, 0, Math.PI * 2);
  ctx.arc(110 - wave * 20, 180 + wave * 30, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCartoonSpeechBubble(ctx, x, y, w, h, text) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 4;
  roundedRect(ctx, x, y, w, h, 24);
  ctx.fill();
  ctx.stroke();
  // tail
  ctx.beginPath();
  ctx.moveTo(x + 60, y + h);
  ctx.lineTo(x + 40, y + h + 28);
  ctx.lineTo(x + 90, y + h - 2);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "700 28px Arial, sans-serif";
  ctx.textAlign = "left";
  splitLines(text, 22).slice(0, 4).forEach((line, i) => {
    ctx.fillText(line, x + 22, y + 42 + i * 36);
  });
  ctx.restore();
}

function drawCartoonFrame(ctx, frame, totalFrames, width, height, title, scenes, sceneIndex, sceneT) {
  const palette = CARTOON_PALETTES[sceneIndex % CARTOON_PALETTES.length];
  drawCartoonScenery(ctx, width, height, sceneT, palette);

  const colors = [
    { skin: "#ffd9b3", hair: "#2a1810", shirt: "#ef476f" },
    { skin: "#e0a878", hair: "#1a1a2e", shirt: "#06d6a0" },
    { skin: "#f5cba7", hair: "#7a3e1a", shirt: "#118ab2" },
  ];
  const c = colors[sceneIndex % colors.length];
  drawCartoonCharacter(ctx, width / 2, height * 0.55, 1.6, sceneT, palette, true, c.skin, c.hair, c.shirt);

  // scene title chip
  ctx.fillStyle = "rgba(26,26,46,0.85)";
  roundedRect(ctx, 40, 60, width - 80, 90, 20);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "800 38px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText((title || "Cena").toUpperCase(), width / 2, 118);

  // speech bubble with scene text
  const sceneText = scenes[sceneIndex] || "";
  drawCartoonSpeechBubble(ctx, 60, height * 0.78, width - 120, 200, sceneText);

  // scene counter
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 22px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`CENA ${sceneIndex + 1}/${scenes.length}`, width - 40, 200);

  // fade transition between scenes
  if (sceneT < 0.08) {
    ctx.fillStyle = `rgba(0,0,0,${(0.08 - sceneT) / 0.08})`;
    ctx.fillRect(0, 0, width, height);
  } else if (sceneT > 0.92) {
    ctx.fillStyle = `rgba(0,0,0,${(sceneT - 0.92) / 0.08})`;
    ctx.fillRect(0, 0, width, height);
  }

  const t = frame / Math.max(1, totalFrames);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, height - 14, width * t, 14);
}

function splitScenes(text) {
  if (!text) return ["Cena de abertura"];
  const parts = String(text)
    .split(/\n\s*\n|---|\|\|/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

function drawVideoFrame(ctx, frame, totalFrames, width, height, title, category, scene) {
  const t = frame / Math.max(1, totalFrames);
  const selected = CATEGORIES[category] || CATEGORIES.dramatico;
  const mode = detectSceneMode(category, scene);
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

  const cameraZoom = 1 + t * 0.08;
  ctx.save();
  ctx.translate(width / 2, height / 2 + 80);
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-width / 2, -(height / 2 + 80));

  if (mode === "people" || mode === "mixed") {
    drawPerson(ctx, width * (mode === "mixed" ? 0.35 : 0.42), 640 + Math.sin(t * Math.PI * 2) * 8, mode === "mixed" ? 1.24 : 1.42, t, true);
    if (mode === "people") {
      drawPerson(ctx, width * 0.64, 688 + Math.sin(t * Math.PI * 2 + 1.4) * 8, 1.14, t + 0.18, false);
    }
  }
  if (mode === "objects" || mode === "mixed") {
    drawCinematicObjects(ctx, width, height, t, scene);
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

  const cardY = 935 + Math.sin(t * Math.PI) * -16;
  ctx.fillStyle = "rgba(255, 245, 218, 0.08)";
  ctx.strokeStyle = "rgba(214, 165, 74, 0.42)";
  ctx.lineWidth = 2;
  roundedRect(ctx, 64, cardY, width - 128, 240, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 245, 218, 0.92)";
  ctx.font = "400 32px Arial, sans-serif";
  ctx.textAlign = "left";
  splitLines(scene || selected.action, 31).slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, 104, cardY + 88 + i * 48);
  });

  ctx.fillStyle = "rgba(214, 165, 74, 0.88)";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.fillText("MOVIMENTO • FALA • SORRISO • OBJETOS", 104, cardY + 208);

  const progress = width * t;
  ctx.fillStyle = "rgba(214, 165, 74, 0.94)";
  ctx.fillRect(0, height - 18, progress, 18);
}

export default function ViralVideoStudio() {
  const [style, setStyle] = useState("cinematico");
  const [category, setCategory] = useState("dramatico");
  const [customScene, setCustomScene] = useState("");
  const [title, setTitle] = useState("Vídeo viral jurídico / storytelling");
  const [durationSeconds, setDurationSeconds] = useState(12);
  const [videoUrl, setVideoUrl] = useState("");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [generatingEmergent, setGeneratingEmergent] = useState(false);
  const [emergentKey, setEmergentKey] = useState(() => {
    try { return localStorage.getItem("kenia.emergent.video.key") || ""; } catch { return ""; }
  });
  const lastVideoUrl = useRef("");

  const saveEmergentKey = (value) => {
    setEmergentKey(value);
    try {
      if (value) localStorage.setItem("kenia.emergent.video.key", value);
      else localStorage.removeItem("kenia.emergent.video.key");
    } catch { /* noop */ }
  };

  const generateWithEmergent = async () => {
    if (generatingEmergent) return;
    setGeneratingEmergent(true);
    try {
      const seconds = Math.min(8, Math.max(4, clampDuration(durationSeconds)));
      const veoPrompt = buildVeoPrompt(prompt, category, customScene, seconds);
      const { data, error } = await supabase.functions.invoke("emergent-video", {
        body: {
          prompt: veoPrompt,
          durationSeconds: seconds,
          aspectRatio: "9:16",
          overrideKey: emergentKey || undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha na geração via Emergent");
      const url = data.url || (data.b64 ? `data:video/mp4;base64,${data.b64}` : "");
      if (!url) throw new Error("Resposta sem URL de vídeo");
      setVideoUrl(url);
      const via = data.provider === "replicate" ? "Replicate (Kling v2.1) — fallback" : "Emergent (Veo)";
      toast.success(`Vídeo gerado via ${via} (${seconds}s)`);
    } catch (e) {
      toast.error(e?.message || "Falha ao gerar vídeo");
    } finally {
      setGeneratingEmergent(false);
    }
  };

  const [generatingGemini, setGeneratingGemini] = useState(false);
  const generateWithGemini = async () => {
    if (generatingGemini) return;
    setGeneratingGemini(true);
    try {
      const seconds = Math.min(10, Math.max(4, clampDuration(durationSeconds)));
      const veoPrompt = buildVeoPrompt(prompt, category, customScene, seconds);
      toast.info("Gerando com Gemini/Vertex (Veo)... até 5 min");
      const { data, error } = await supabase.functions.invoke("emergent-video", {
        body: { prompt: veoPrompt, durationSeconds: seconds, aspectRatio: "9:16", provider: "gemini", overrideKey: emergentKey || undefined },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha Gemini");
      const url = data.url || (data.b64 ? `data:video/mp4;base64,${data.b64}` : "");
      if (!url) throw new Error("Sem URL de vídeo");
      setVideoUrl(url);
      toast.success(`Vídeo gerado via Gemini/Vertex (${seconds}s)`);
    } catch (e) {
      const msg = String(e?.message || e || "Falha Gemini");
      toast.error(msg);
    } finally {
      setGeneratingGemini(false);
    }
  };

  const [generatingReplicate, setGeneratingReplicate] = useState(false);
  const generateWithReplicate = async () => {
    if (generatingReplicate) return;
    setGeneratingReplicate(true);
    try {
      const seconds = Math.min(10, Math.max(4, clampDuration(durationSeconds)));
      const veoPrompt = buildVeoPrompt(prompt, category, customScene, seconds);
      toast.info("Gerando com Kling v2.1 (pode levar 3-8 min)...");
      const { data, error } = await supabase.functions.invoke("emergent-video", {
        body: { prompt: veoPrompt, durationSeconds: seconds, aspectRatio: "9:16", provider: "replicate" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha Replicate");
      const url = data.url || (data.b64 ? `data:video/mp4;base64,${data.b64}` : "");
      if (!url) throw new Error("Sem URL de vídeo");
      setVideoUrl(url);
      toast.success(`Vídeo Kling v2.1 gerado (${seconds}s)`);
    } catch (e) {
      const msg = String(e?.message || e || "Falha Replicate");
      if (/insufficient credit/i.test(msg)) {
        toast.error("Replicate sem créditos. Adicione saldo em replicate.com/account/billing e tente novamente.", { duration: 8000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setGeneratingReplicate(false);
    }

  };


  const enhancePrompt = async () => {
    if (enhancing) return;
    setEnhancing(true);
    try {
      const selected = CATEGORIES[category] || CATEGORIES.dramatico;
      const { data, error } = await supabase.functions.invoke("enhance-video-prompt", {
        body: {
          scene: customScene || selected.action,
          category: selected.label,
          mood: selected.mood,
          durationSeconds: safeDuration,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.prompt) {
        setCustomScene(data.prompt);
        toast.success(`Prompt aprimorado via ${data.provider || "IA"}`);
      } else {
        toast.error("Não foi possível aprimorar o prompt");
      }
    } catch (e) {
      toast.error(e?.message || "Falha ao aprimorar prompt");
    } finally {
      setEnhancing(false);
    }
  };

  const safeDuration = clampDuration(durationSeconds);
  const prompt = useMemo(() => buildPrompt(category, customScene, safeDuration), [category, customScene, safeDuration]);

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
      const seconds = clampDuration(durationSeconds);
      const longVideo = seconds > 60;
      const width = longVideo ? 540 : 720;
      const height = longVideo ? 960 : 1280;
      const fps = seconds > 90 ? 12 : seconds > 45 ? 18 : 24;
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
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: longVideo ? 2_000_000 : 4_000_000 });
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.start();
      const scenes = splitScenes(customScene || CATEGORIES[category]?.action);
      const framesPerScene = Math.max(1, Math.floor(totalFrames / scenes.length));
      for (let frame = 0; frame <= totalFrames; frame += 1) {
        if (style === "cartoon") {
          const sceneIndex = Math.min(scenes.length - 1, Math.floor(frame / framesPerScene));
          const sceneT = (frame - sceneIndex * framesPerScene) / framesPerScene;
          drawCartoonFrame(ctx, frame, totalFrames, width, height, title, scenes, sceneIndex, sceneT);
        } else {
          drawVideoFrame(ctx, frame, totalFrames, width, height, title, category, customScene);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
      }
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
      await stopped;
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      lastVideoUrl.current = url;
      setVideoUrl(url);
      toast.success(`Vídeo de ${seconds}s gerado e pronto para baixar`);
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
          Gere vídeos verticais com pessoas falando/sorrindo, objetos em movimento e duração de 6 segundos até 5 minutos.
        </p>
      </div>

      <div className="p-6 overflow-auto">
        <div className="max-w-6xl mx-auto grid xl:grid-cols-[1fr_0.9fr] gap-5">
          <Card className="p-5 bg-nude-900/60 border-gold-900/40 space-y-5">
            <div className="grid md:grid-cols-[1fr_220px_160px] gap-4">
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
              <div className="space-y-2">
                <Label className="text-gold-200">Duração (6–300s)</Label>
                <Input
                  type="number"
                  min="6"
                  max="300"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(clampDuration(e.target.value))}
                  className="bg-nude-950 border-gold-900/40 text-gold-100 placeholder:text-nude-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "cinematico", label: "🎬 Cinematográfico realista" },
                { key: "cartoon", label: "🎨 Cartoon / HeyGen (cenas)" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStyle(opt.key)}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${style === opt.key ? "border-gold-500 bg-gold-500/15 text-gold-100" : "border-gold-900/40 bg-nude-950/70 text-nude-300 hover:border-gold-700/70"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {style === "cartoon" && (
              <p className="text-xs text-nude-400 -mt-2">
                Dica: separe cenas com linha em branco, <code>---</code> ou <code>||</code>. Cada bloco vira uma cena animada com personagem falando.
              </p>
            )}

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
                placeholder="Ex.: uma pessoa falando e sorrindo no escritório; maçã girando na mesa; carro em movimento; objetos variados passando pela câmera."
                className="bg-nude-950 border-gold-900/40 text-gold-100 placeholder:text-nude-600"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs text-nude-300">
              {[6, 15, 30, 60, 300].map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => setDurationSeconds(seconds)}
                  className={`rounded-md border px-2 py-2 ${safeDuration === seconds ? "border-gold-500 bg-gold-500/10 text-gold-100" : "border-gold-900/40 bg-nude-950/70 hover:border-gold-700/70"}`}
                >
                  {seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}min`}
                </button>
              ))}
            </div>

            <div className="space-y-2 rounded-md border border-gold-900/40 bg-nude-950/70 p-3">
              <Label className="text-gold-200 text-xs uppercase tracking-wide">Chave do modelo (opcional)</Label>
              <Input
                value={emergentKey}
                onChange={(e) => saveEmergentKey(e.target.value)}
                placeholder="sk-emergent-... (deixe em branco para usar a chave do sistema)"
                className="bg-nude-950 border-gold-900/40 text-gold-100 placeholder:text-nude-600"
              />
              <p className="text-[11px] text-nude-400">Salva localmente no navegador. Usada apenas na geração via modelo de crédito (Veo).</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={enhancePrompt}
                disabled={enhancing}
                variant="outline"
                className="border-gold-500/70 bg-gold-500/10 text-gold-100 hover:bg-gold-500/20"
              >
                {enhancing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {enhancing ? "Aprimorando..." : "Aprimorar com IA (Ollama)"}
              </Button>
              <Button
                onClick={copyPrompt}
                variant="outline"
                className="border-gold-700/60 bg-nude-950 text-gold-100 hover:bg-gold-500/10"
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar prompt final
              </Button>
              <Button
                onClick={generateWithEmergent}
                disabled={generatingEmergent}
                variant="outline"
                className="border-gold-500/70 bg-gold-500/10 text-gold-100 hover:bg-gold-500/20"
              >
                {generatingEmergent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {generatingEmergent ? "Gerando (Modelo de Crédito)..." : "Gerar com Modelo de Crédito (Veo)"}
              </Button>
              <Button
                onClick={generateWithGemini}
                disabled={generatingGemini}
                variant="outline"
                className="border-blue-500/70 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
              >
                {generatingGemini ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {generatingGemini ? "Gerando (Gemini)..." : "Gerar com Gemini (Vertex / Veo)"}
              </Button>
              <Button
                onClick={generateWithReplicate}
                disabled={generatingReplicate}
                variant="outline"
                className="border-emerald-500/70 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
              >
                {generatingReplicate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {generatingReplicate ? "Gerando (Kling)..." : "Gerar com Replicate (Kling v2.1 — realista)"}
              </Button>
              <Button
                onClick={generateVideo}
                disabled={generatingVideo}
                className="bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 text-nude-950 font-semibold"
              >
                {generatingVideo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Film className="w-4 h-4 mr-2" />}
                {generatingVideo ? "Gerando vídeo..." : "Gerar vídeo local"}
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
              <span>O prompt orienta uma tomada contínua: movimento real de objetos, pessoas falando/sorrindo e duração configurada até 5 minutos.</span>
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