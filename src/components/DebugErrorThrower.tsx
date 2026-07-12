import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error", guarda a mensagem em state e,
 * durante o render, lança um erro real para acionar o overlay global da
 * Lovable e o botão "Try to Fix".
 *
 * DEVE ficar FORA de qualquer ErrorBoundary / Suspense / try-catch.
 * NÃO substituir o throw por toast, log ou console.error.
 * NÃO suprimir mensagens — o throw é intencional e é a feature.
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
    // Intencional: erro fatal durante o render para o overlay/"Try to Fix" da Lovable.
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
