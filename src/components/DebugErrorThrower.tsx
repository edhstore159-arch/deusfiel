import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" sem derrubar a prévia.
 * A instrução chega pelo chat/erro reportado ao agente; manter o app rodando
 * evita tela branca enquanto a correção é aplicada.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!message) return;
    console.info("lovable-debug-instruction", message);
    const timeout = window.setTimeout(() => setMessage(null), 250);
    return () => window.clearTimeout(timeout);
  }, [message]);

  return null;
};

export default DebugErrorThrower;
