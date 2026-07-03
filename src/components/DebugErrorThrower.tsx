import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e converte a instrução em erro
 * fatal de runtime. Isso é INTENCIONAL — o erro precisa escapar para o overlay
 * global da Lovable para acionar o botão "Try to Fix".
 *
 * Não envolver em ErrorBoundary. Não substituir throw por console/toast.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        // Lança fora do ciclo de renderização do React: continua sendo um erro
        // global real para o overlay/Try to Fix, mas não desmonta a árvore inteira
        // do app nem deixa a tela presa em branco depois do disparo intencional.
        window.setTimeout(() => {
          throw new Error(detail);
        }, 0);
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
