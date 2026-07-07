import { useEffect, useState } from "react";
import { shouldSuppressLovableDebugInstruction } from "@/components/debugInstruction";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error". Instruções disparadas pela
 * ferramenta interna não devem derrubar o app em preview/publicação.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        if (shouldSuppressLovableDebugInstruction(detail)) {
          console.info("Instrução de debug registrada sem interromper a interface.");
          setMessage(null);
          return;
        }
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  useEffect(() => {
    if (message && shouldSuppressLovableDebugInstruction(message)) {
      setMessage(null);
    }
  }, [message]);

  if (message) {
    if (shouldSuppressLovableDebugInstruction(message)) return null;
    throw new Error(message);
  }

  return null;
};

export default DebugErrorThrower;
