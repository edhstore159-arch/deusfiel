import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e lança um erro fatal de runtime.
 * Este componente é CRÍTICO: deve ficar fora de ErrorBoundary, Suspense e qualquer boundary.
 * 
 * IMPORTANTE: Qualquer mensagem enviada será lançada como erro, sem supressão.
 * Não trate esse erro com try/catch ou log silencioso.
 * O objetivo é fazer o erro chegar ao overlay global da Lovable para que o "Try to Fix" aja.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        // Sempre lança o erro sem supressão de nenhum tipo
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  // Este throw é INTENCIONAL e faz parte da feature
  // NÃO remover, NÃO mover para dentro de ErrorBoundary, NÃO tratar com try/catch
  if (message) {
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
