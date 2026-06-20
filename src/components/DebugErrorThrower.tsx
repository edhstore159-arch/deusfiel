import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" sem derrubar a aplicação.
 * Essas instruções são usadas como sinal de debug, mas não devem gerar
 * tela branca para quem está usando o app.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.warn("Lovable debug instruction captured:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
