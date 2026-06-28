import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e, durante o render,
 * lança um erro fatal de runtime contendo a instrução.
 *
 * Esse erro é INTENCIONAL — ele precisa escapar para o overlay global
 * da Lovable para que o botão "Try to Fix" seja acionado.
 *
 * NÃO envolver este componente em ErrorBoundary, Suspense ou try/catch.
 * NÃO substituir o throw por console.error/toast/log silencioso.
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
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
