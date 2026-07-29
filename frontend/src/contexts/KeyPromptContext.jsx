import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const KeyPromptContext = createContext(null);

export function KeyPromptProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState(null);

  const show = useCallback((src) => {
    setSource(src || null);
    setNewKey("");
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    setSource(null);
    setNewKey("");
  }, []);

  const saveKey = useCallback(async () => {
    if (!newKey.trim()) {
      toast.error("Cole a nova chave Emergent");
      return;
    }
    setSaving(true);
    try {
      await api.put("/settings", {
        llm_text_key: newKey.trim(),
        llm_image_key: newKey.trim(),
      });
      toast.success("Chave salva! Recarregando...");
      hide();
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error("Erro ao salvar chave");
    } finally {
      setSaving(false);
    }
  }, [newKey, hide]);

  useEffect(() => {
    const handler = (e) => show(e.detail?.source);
    window.addEventListener("opencode:insufficient_balance", handler);
    return () => window.removeEventListener("opencode:insufficient_balance", handler);
  }, [show]);

  return (
    <KeyPromptContext.Provider value={{ open, newKey, setNewKey, saving, source, show, hide, saveKey }}>
      {children}
    </KeyPromptContext.Provider>
  );
}

export function useKeyPrompt() {
  const ctx = useContext(KeyPromptContext);
  if (!ctx) throw new Error("useKeyPrompt must be inside KeyPromptProvider");
  return ctx;
}
