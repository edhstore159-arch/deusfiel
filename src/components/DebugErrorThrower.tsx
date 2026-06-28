import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e converte a instrução em um erro fatal de
 * runtime durante o render. Esse erro é INTENCIONAL: ele escapa para o
 * overlay global da Lovable para acionar o botão "Try to Fix".
 *
 * NÃO envolver em ErrorBoundary/Suspense.
 * NÃO remover o throw.
 * NÃO trocar por console.error / toast / log silencioso.
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

  if (message) {
    // Intencional: cai no overlay global da Lovable para usar "Try to Fix".
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
