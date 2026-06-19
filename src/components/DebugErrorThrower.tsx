import { useEffect, useRef } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e lança um Error global intencional contendo
 * a instrução. Isso é INTENCIONAL: o objetivo é cair no overlay global de
 * erro da Lovable para que o botão "Try to Fix" receba a instrução, sem
 * passar pela sidebar/chat.
 *
 * NÃO envolver em ErrorBoundary/Suspense.
 * NÃO substituir o throw por toast, log, modal, try/catch ou boundary.
 */
export const DebugErrorThrower = () => {
  const scheduledThrowRef = useRef(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim().length > 0 && !scheduledThrowRef.current) {
        const message = detail.trim();
        scheduledThrowRef.current = true;

        window.setTimeout(() => {
          scheduledThrowRef.current = false;
          // Throw proposital fora do ciclo de render do React: aciona o overlay
          // global da Lovable sem desmontar a árvore inteira e sem tela branca.
          throw new Error(message);
        }, 0);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
