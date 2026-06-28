import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e converte a instrução em um erro fatal real
 * de runtime durante o render. O erro precisa escapar para o overlay global
 * da Lovable (ficar FORA de qualquer ErrorBoundary/Suspense) para que o botão
 * "Try to Fix" seja acionado pelo usuário.
 *
 * NÃO envolver em try/catch, NÃO trocar por console.error, NÃO colocar dentro
 * de ErrorBoundary. O blank screen momentâneo é esperado — é o gatilho do
 * overlay global.
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
    console.warn("[DebugErrorThrower]", message);
  }

  return null;
};

export default DebugErrorThrower;
