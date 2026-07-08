import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e lança um erro fatal real
 * durante o render, para escapar até o overlay global da Lovable e
 * acionar o botão "Try to Fix".
 *
 * NÃO envolver em ErrorBoundary / Suspense / try-catch.
 * NÃO substituir o throw por toast, log ou console.error.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;
      setMessage(detail);
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  if (message) {
    // Intencional: escapa para o overlay global da Lovable.
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
