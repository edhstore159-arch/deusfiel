import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e lança um erro global real
 * fora do ciclo de render do React, para acionar o botão "Try to Fix"
 * sem desmontar a aplicação nem deixar tela em branco.
 *
 * NÃO envolver em ErrorBoundary / Suspense / try-catch.
 * NÃO substituir o throw por toast, log ou console.error.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;

      window.setTimeout(() => {
        // Intencional: erro global real para o overlay/"Try to Fix" da Lovable.
        // Como ocorre fora do render, o React não desmonta a árvore e a tela não fica em branco.
        throw new Error(detail);
      }, 0);
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
