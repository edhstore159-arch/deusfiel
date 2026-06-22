// Persistência das configurações da SECRETÁRIA VIRTUAL DE CHAT (Dashboard).
// Chaves usam o prefixo "kenia:chat-".

export const CHAT_KEYS = {
  prompt: "kenia:chat-prompt",
  enabled: "kenia:chat-enabled",
  model: "kenia:chat-model",
  history: "kenia:chat-history",
};

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };

export const CHAT_DEFAULT_PROMPT =
  "Você é a secretária virtual do escritório da Dra. Kênia Garcia. Responda com dados REAIS do escritório (contatos, leads, processos, agendamentos). Quando o usuário pedir números de clientes, traga os totais reais da base. Seja clara e cordial.";

export function loadChatConfig() {
  let history = [];
  try { history = JSON.parse(safeGet(CHAT_KEYS.history) || "[]"); } catch { history = []; }
  return {
    prompt: safeGet(CHAT_KEYS.prompt) || CHAT_DEFAULT_PROMPT,
    enabled: (safeGet(CHAT_KEYS.enabled) ?? "1") === "1",
    model: safeGet(CHAT_KEYS.model) || "google/gemini-2.5-flash",
    history,
  };
}

export function saveChatConfig(cfg = {}) {
  if (cfg.prompt !== undefined) safeSet(CHAT_KEYS.prompt, String(cfg.prompt));
  if (cfg.enabled !== undefined) safeSet(CHAT_KEYS.enabled, cfg.enabled ? "1" : "0");
  if (cfg.model !== undefined) safeSet(CHAT_KEYS.model, String(cfg.model));
  if (cfg.history !== undefined) {
    try { safeSet(CHAT_KEYS.history, JSON.stringify(cfg.history)); } catch {}
  }
  return loadChatConfig();
}

export const CHAT_DEFAULTS = {
  prompt: CHAT_DEFAULT_PROMPT,
  enabled: true,
  model: "google/gemini-2.5-flash",
  history: [],
};
