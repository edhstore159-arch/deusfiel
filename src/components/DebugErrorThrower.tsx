import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error", guarda a mensagem em state e,
 * durante o render, lança um erro real para acionar o overlay global da
 * Lovable e o botão "Try to Fix".
 *
 * DEVE ficar FORA de qualquer ErrorBoundary / Suspense / try-catch.
 * NÃO substituir o throw por toast, log ou console.error.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;

      // Lança fora do ciclo de render do React: o overlay global de erro ainda
      // recebe o erro, mas a árvore do app não desmonta nem fica em tela branca.
      window.setTimeout(() => {
        throw new Error(detail);
      }, 0);
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
