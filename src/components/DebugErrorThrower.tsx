import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e lança um erro fatal em render contendo
 * a instrução. Esse erro é INTENCIONAL: ele precisa escapar para o
 * overlay global da Lovable para que o usuário possa clicar em
 * "Try to Fix". Não envolver em try/catch, ErrorBoundary, toast ou log
 * silencioso. Não substituir o throw por console.error.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.warn("Debug instruction received without crashing the app:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
