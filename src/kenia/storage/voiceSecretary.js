// Persistência das configurações da SECRETÁRIA DE VOZ (Kênia)
// Todas as chaves usam o prefixo "kenia:voice-" para fácil identificação.

import { KENIA_PROMPT_KEY, DEFAULT_KENIA_PROMPT, loadKeniaPrompt, saveKeniaPrompt } from "../lib/keniaPrompt";

export const VOICE_KEYS = {
  prompt: KENIA_PROMPT_KEY,            // "kenia:voice-prompt"
  alwaysOn: "kenia:voice-always-on",
  lang: "kenia:voice-lang",
  rate: "kenia:voice-rate",
  pitch: "kenia:voice-pitch",
  voiceName: "kenia:voice-name",
};

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };

export function loadVoiceConfig() {
  return {
    prompt: loadKeniaPrompt(),
    alwaysOn: safeGet(VOICE_KEYS.alwaysOn) === "1",
    lang: safeGet(VOICE_KEYS.lang) || "pt-BR",
    rate: parseFloat(safeGet(VOICE_KEYS.rate) || "1") || 1,
    pitch: parseFloat(safeGet(VOICE_KEYS.pitch) || "1") || 1,
    voiceName: safeGet(VOICE_KEYS.voiceName) || "",
  };
}

export function saveVoiceConfig(cfg = {}) {
  if (cfg.prompt !== undefined) saveKeniaPrompt(cfg.prompt);
  if (cfg.alwaysOn !== undefined) safeSet(VOICE_KEYS.alwaysOn, cfg.alwaysOn ? "1" : "0");
  if (cfg.lang !== undefined) safeSet(VOICE_KEYS.lang, String(cfg.lang));
  if (cfg.rate !== undefined) safeSet(VOICE_KEYS.rate, String(cfg.rate));
  if (cfg.pitch !== undefined) safeSet(VOICE_KEYS.pitch, String(cfg.pitch));
  if (cfg.voiceName !== undefined) safeSet(VOICE_KEYS.voiceName, String(cfg.voiceName));
  return loadVoiceConfig();
}

export const VOICE_DEFAULTS = {
  prompt: DEFAULT_KENIA_PROMPT,
  alwaysOn: false,
  lang: "pt-BR",
  rate: 1,
  pitch: 1,
  voiceName: "",
};
