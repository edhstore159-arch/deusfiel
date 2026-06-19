import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Compatibilidade para eventos antigos de debug sem derrubar a aplicação.
 * O fluxo atual salva instruções pelo fallback em vez de lançar erro fatal.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.warn("Instrução de debug recebida sem interromper a aplicação.");
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
