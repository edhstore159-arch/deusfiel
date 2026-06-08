import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta instruções internas de debug sem derrubar a aplicação.
 * O throw fatal antigo causava tela branca em preview/produção quando alguém
 * registrava uma instrução administrativa.
 */
export const DebugErrorThrower = () => {
  const [, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setLastMessage(detail);
        console.info("Instrução interna registrada:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
