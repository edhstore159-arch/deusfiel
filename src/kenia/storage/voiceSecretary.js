// Persistência das configurações da SECRETÁRIA DE VOZ (Kênia)
// Todas as chaves usam o prefixo "kenia:voice-" para fácil identificação.

import { KENIA_PROMPT_KEY, DEFAULT_KENIA_PROMPT, loadKeniaPrompt, saveKeniaPrompt } from "../lib/keniaPrompt";

export const VOICE_KEYS = {
  prompt: KENIA_PROMPT_KEY,            // "kenia:voice-prompt"
  alwaysOn: "kenia:voice-always-on",
  lang: "kenia:voice-lang",
  responseLang: "kenia:voice-response-lang",
  rate: "kenia:voice-rate",
  pitch: "kenia:voice-pitch",
  voiceName: "kenia:voice-name",
};

export const VOICE_LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português", promptName: "Português do Brasil", speechLang: "pt-BR" },
  { value: "fr-FR", label: "Francês", promptName: "francês", speechLang: "fr-FR" },
  { value: "es-ES", label: "Espanhol", promptName: "espanhol", speechLang: "es-ES" },
  { value: "en-US", label: "Inglês", promptName: "inglês", speechLang: "en-US" },
];

export const getVoiceLanguageOption = (value) => {
  return VOICE_LANGUAGE_OPTIONS.find((item) => item.value === value) || VOICE_LANGUAGE_OPTIONS[0];
};

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };

export function loadVoiceConfig() {
  return {
    prompt: loadKeniaPrompt(),
    alwaysOn: safeGet(VOICE_KEYS.alwaysOn) === "1",
    lang: safeGet(VOICE_KEYS.lang) || "pt-BR",
    responseLang: safeGet(VOICE_KEYS.responseLang) || safeGet(VOICE_KEYS.lang) || "pt-BR",
    rate: parseFloat(safeGet(VOICE_KEYS.rate) || "1") || 1,
    pitch: parseFloat(safeGet(VOICE_KEYS.pitch) || "1") || 1,
    voiceName: safeGet(VOICE_KEYS.voiceName) || "",
  };
}

export function saveVoiceConfig(cfg = {}) {
  if (cfg.prompt !== undefined) saveKeniaPrompt(cfg.prompt);
  if (cfg.alwaysOn !== undefined) safeSet(VOICE_KEYS.alwaysOn, cfg.alwaysOn ? "1" : "0");
  if (cfg.lang !== undefined) safeSet(VOICE_KEYS.lang, String(cfg.lang));
  if (cfg.responseLang !== undefined) safeSet(VOICE_KEYS.responseLang, String(cfg.responseLang));
  if (cfg.rate !== undefined) safeSet(VOICE_KEYS.rate, String(cfg.rate));
  if (cfg.pitch !== undefined) safeSet(VOICE_KEYS.pitch, String(cfg.pitch));
  if (cfg.voiceName !== undefined) safeSet(VOICE_KEYS.voiceName, String(cfg.voiceName));
  return loadVoiceConfig();
}

export const VOICE_DEFAULTS = {
  prompt: DEFAULT_KENIA_PROMPT,
  alwaysOn: false,
  lang: "pt-BR",
  responseLang: "pt-BR",
  rate: 1,
  pitch: 1,
  voiceName: "",
};
