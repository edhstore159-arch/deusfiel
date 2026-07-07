import { useEffect, useState } from "react";
import { shouldSuppressLovableDebugInstruction } from "./debugInstruction";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error". Mensagens internas de instrução
 * da Lovable são suprimidas aqui para não derrubar a aplicação em produção.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        if (shouldSuppressLovableDebugInstruction(detail)) {
          console.info("[debug] Instrução interna suprimida para evitar tela em branco.");
          return;
        }
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  if (message) {
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
