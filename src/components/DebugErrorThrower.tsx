import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" sem derrubar a aplicação.
 * A versão anterior convertia instruções em erro fatal de runtime, causando
 * tela branca em produção/preview quando alguém usava a ferramenta interna.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        console.info("Instrução de debug recebida sem interromper a aplicação.");
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
