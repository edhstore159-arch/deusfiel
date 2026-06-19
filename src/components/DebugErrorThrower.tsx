import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o evento global "lovable-debug-error" e converte a instrução em
 * erro fatal de runtime para que o overlay nativo da Lovable apareça com
 * o botão "Try to Fix". Deve ficar FORA de qualquer ErrorBoundary.
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
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
