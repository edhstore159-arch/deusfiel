import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" sem derrubar a aplicação.
 * Antes este componente convertia instruções de debug em erro fatal, causando
 * tela branca para usuários finais sempre que uma instrução era enviada.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        console.warn("Debug instruction captured:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
