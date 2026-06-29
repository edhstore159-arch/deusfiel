import { useEffect, useState } from "react";
import { shouldSuppressLovableDebugInstruction } from "@/components/debugInstruction";

/**
 * DebugErrorThrower
 *
 * Escuta o CustomEvent "lovable-debug-error" e, durante o render,
 * lança um erro fatal de runtime contendo a instrução.
 *
 * Por segurança, o erro fatal só é disparado quando houver opt-in explícito.
 * Sem isso, instruções de debug são tratadas pelo fallback e não derrubam a tela.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        if (shouldSuppressLovableDebugInstruction(detail)) return;
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  if (message) {
    const toThrow = message;
    // Clear on next tick so React's error recovery rerender doesn't re-throw forever.
    queueMicrotask(() => setMessage(null));
    throw new Error(toThrow);
  }

  return null;
};

export default DebugErrorThrower;
