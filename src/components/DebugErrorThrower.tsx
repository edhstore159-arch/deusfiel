import { useEffect, useState } from "react";
import { shouldSuppressLovableDebugInstruction } from "@/components/debugInstruction";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e, em vez de derrubar a UI,
 * exibe um diagnóstico amigável no canto da tela. Instruções internas
 * (prefixo "INSTRUÇÃO DE DESENVOLVIMENTO…") são silenciadas.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;
      if (shouldSuppressLovableDebugInstruction(detail)) {
        console.info("[debug] Instrução interna ignorada (não fatal).");
        return;
      }
      console.warn("[debug] Erro de runtime capturado:", detail);
      setMessage(detail);
    };
    window.addEventListener("lovable-debug-error", handler);

    const onError = (e: ErrorEvent) => {
      const msg = e?.message || "";
      if (shouldSuppressLovableDebugInstruction(msg)) {
        e.preventDefault?.();
        console.info("[debug] Erro global suprimido (instrução interna).");
        return;
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String((e?.reason as any)?.message || e?.reason || "");
      if (shouldSuppressLovableDebugInstruction(msg)) {
        e.preventDefault?.();
        console.info("[debug] Rejeição suprimida (instrução interna).");
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("lovable-debug-error", handler);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 100000,
        maxWidth: 380,
        background: "#111",
        color: "#fff",
        border: "1px solid #f87171",
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
      role="alert"
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <strong style={{ color: "#fca5a5" }}>Erro de runtime</strong>
        <button
          onClick={() => setMessage(null)}
          style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer" }}
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
      <div style={{ whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>{message}</div>
    </div>
  );
};

export default DebugErrorThrower;
