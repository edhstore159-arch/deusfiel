import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Compatibilidade com versões antigas da ferramenta de debug.
 * Não lança mais erro fatal, para evitar tela branca no app.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        window.dispatchEvent(new CustomEvent("lovable-debug-instruction", { detail }));
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
