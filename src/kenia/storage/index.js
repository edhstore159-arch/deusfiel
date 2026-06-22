// Pasta central de configurações persistidas das secretárias (voz + chat).
// Tudo é salvo em localStorage e restaurado automaticamente ao reabrir o app.

export * from "./voiceSecretary";
export * from "./chatSecretary";

import { VOICE_KEYS, loadVoiceConfig, saveVoiceConfig } from "./voiceSecretary";
import { CHAT_KEYS, loadChatConfig, saveChatConfig } from "./chatSecretary";

export function loadAllSecretaryConfig() {
  return { voice: loadVoiceConfig(), chat: loadChatConfig() };
}

export function exportSecretaryConfig() {
  return JSON.stringify(loadAllSecretaryConfig(), null, 2);
}

export function importSecretaryConfig(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  if (data?.voice) saveVoiceConfig(data.voice);
  if (data?.chat) saveChatConfig(data.chat);
  return loadAllSecretaryConfig();
}

// Auto-teste: grava valores de teste, lê de volta, restaura originais.
// Retorna { ok, results, errors }.
export function runSecretaryStorageSelfTest() {
  const errors = [];
  const results = [];
  const allKeys = [...Object.values(VOICE_KEYS), ...Object.values(CHAT_KEYS)];
  const backup = {};
  try {
    for (const k of allKeys) backup[k] = localStorage.getItem(k);
  } catch (e) {
    return { ok: false, results, errors: ["localStorage indisponível: " + e.message] };
  }

  try {
    // VOICE round-trip
    const voiceSample = { prompt: "TEST_PROMPT_VOICE", alwaysOn: true, lang: "pt-BR", rate: 1.2, pitch: 0.9, voiceName: "TestVoice" };
    saveVoiceConfig(voiceSample);
    const v = loadVoiceConfig();
    for (const k of Object.keys(voiceSample)) {
      const ok = String(v[k]) === String(voiceSample[k]);
      results.push({ scope: "voice", key: k, expected: voiceSample[k], got: v[k], ok });
      if (!ok) errors.push(`voice.${k}: esperado ${voiceSample[k]} obtido ${v[k]}`);
    }

    // CHAT round-trip
    const chatSample = { prompt: "TEST_PROMPT_CHAT", enabled: false, model: "test/model", history: [{ role: "user", content: "oi" }] };
    saveChatConfig(chatSample);
    const c = loadChatConfig();
    for (const k of Object.keys(chatSample)) {
      const got = k === "history" ? JSON.stringify(c[k]) : String(c[k]);
      const exp = k === "history" ? JSON.stringify(chatSample[k]) : String(chatSample[k]);
      const ok = got === exp;
      results.push({ scope: "chat", key: k, expected: exp, got, ok });
      if (!ok) errors.push(`chat.${k}: esperado ${exp} obtido ${got}`);
    }
  } finally {
    // Restaura
    try {
      for (const k of allKeys) {
        if (backup[k] === null) localStorage.removeItem(k);
        else localStorage.setItem(k, backup[k]);
      }
    } catch {}
  }

  return { ok: errors.length === 0, results, errors };
}

// Expor no window para inspeção/teste manual no console do navegador.
if (typeof window !== "undefined") {
  window.__keniaStorage = {
    loadAll: loadAllSecretaryConfig,
    export: exportSecretaryConfig,
    import: importSecretaryConfig,
    selfTest: runSecretaryStorageSelfTest,
    keys: { ...VOICE_KEYS, ...CHAT_KEYS },
  };
}
