import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
  * Mantém compatibilidade com eventos antigos de debug sem derrubar o app.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        // Evento intencionalmente ignorado para evitar tela branca em produção.
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
