import { useEffect, useState } from "react";
import { shouldSuppressLovableDebugInstruction } from "@/components/debugInstruction";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e só lança erros reais.
 * Instruções internas de desenvolvimento não devem quebrar a tela do app.
 *
 * DEVE ficar FORA de qualquer ErrorBoundary / Suspense / try-catch.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;
      if (shouldSuppressLovableDebugInstruction(detail)) return;
      setMessage(detail);
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  if (message) {
    // Erro fatal apenas para erros reais do aplicativo.
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
