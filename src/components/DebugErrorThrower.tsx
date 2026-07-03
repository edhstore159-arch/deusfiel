import { useEffect, useState } from "react";
import { DEBUG_INSTRUCTION_PREFIX } from "@/components/debugInstruction";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e converte a instrução em erro
 * fatal de runtime (throw em render). Isso é INTENCIONAL — o erro precisa
 * escapar para o overlay global da Lovable para acionar o botão "Try to Fix".
 *
 * Não envolver em ErrorBoundary. Não substituir throw por console/toast.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  if (message) {
    const shouldThrowFatal =
      import.meta.env.VITE_ENABLE_FATAL_DEBUG === "true" ||
      new URLSearchParams(window.location.search).get("fatalDebug") === "1";

    if (!shouldThrowFatal || message.startsWith(DEBUG_INSTRUCTION_PREFIX)) {
      console.warn("Instrução de debug recebida sem quebrar a tela:", message);
      setTimeout(() => setMessage(null), 0);
      return null;
    }

    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
