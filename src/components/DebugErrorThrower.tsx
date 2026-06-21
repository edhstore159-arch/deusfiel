import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e converte a instrução em erro fatal de runtime,
 * para escapar até o overlay global da Lovable e habilitar o "Try to Fix".
 *
 * NÃO envolver em ErrorBoundary/Suspense. NÃO trocar throw por console/log.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.warn("lovable-debug-error recebido sem derrubar a aplicação:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
