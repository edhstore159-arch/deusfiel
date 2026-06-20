import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e, durante o render seguinte, lança um
 * Error fatal contendo a instrução. Isso é INTENCIONAL: o objetivo é
 * cair no overlay global de erro da Lovable para que o botão
 * "Try to Fix" receba a instrução, sem passar pela sidebar/chat.
 *
 * NÃO envolver em ErrorBoundary/Suspense.
 * NÃO substituir o throw por toast, log, modal, try/catch ou boundary.
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
    // Throw proposital durante o render para escapar para o overlay global.
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
