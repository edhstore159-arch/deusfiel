import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Mantém compatibilidade com eventos antigos de debug sem derrubar a tela.
 * Instruções de desenvolvimento não devem virar erro fatal em produção.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.info("Debug instruction received", { length: detail.length });
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
