import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" sem quebrar a aplicação.
 * A versão anterior lançava um erro fatal proposital, o que deixava a tela
 * em branco quando o debug recebia instruções em texto.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        window.dispatchEvent(
          new CustomEvent("lovable-debug-instruction-received", { detail })
        );
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
