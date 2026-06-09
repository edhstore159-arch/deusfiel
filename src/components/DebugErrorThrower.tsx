import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e lança um erro fatal intencional durante o
 * render, para acionar o overlay global da Lovable e o botão "Try to Fix".
 *
 * NÃO envolver em ErrorBoundary. NÃO substituir o throw por log/toast.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.warn("Instrução técnica recebida:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
