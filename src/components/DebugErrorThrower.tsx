import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" sem quebrar a aplicação.
 * Mensagens vindas da interface são tratadas como dados e não devem gerar
 * runtime error/blank screen no dashboard.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        console.warn("Instrução de debug recebida sem interromper a tela:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
