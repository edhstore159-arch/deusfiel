import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e emite um erro global assíncrono.
 * Assim o overlay de runtime recebe a instrução sem derrubar a árvore React nem
 * deixar a aplicação em tela branca.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;
      window.setTimeout(() => {
        throw new Error(detail);
      }, 0);
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
