import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" sem converter a instrução em erro fatal.
 * Isso evita tela em branco quando mensagens de debug chegam pelo preview.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.warn("Debug instruction received:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
