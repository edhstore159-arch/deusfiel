import { useEffect, useState } from "react";
import { shouldSuppressLovableDebugInstruction } from "./debugInstruction";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e só lança erros reais do app.
 * Instruções internas de desenvolvimento não devem derrubar a tela do usuário.
 *
 * DEVE ficar FORA de qualquer ErrorBoundary / Suspense / try-catch.
 * NÃO converter instruções internas em erro fatal.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;
      if (shouldSuppressLovableDebugInstruction(detail)) {
        setMessage(null);
        return;
      }
      setMessage(detail);
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  if (message && !shouldSuppressLovableDebugInstruction(message)) {
    // Intencional: erro fatal durante o render para o overlay/"Try to Fix" da Lovable.
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
