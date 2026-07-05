import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e converte a instrução em erro
 * fatal de runtime, propositalmente, para acionar o overlay global da Lovable
 * e o botão "Try to Fix". NÃO envolver em ErrorBoundary/try-catch/toast.
 * NÃO substituir o throw por console.error. O comportamento é intencional.
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
