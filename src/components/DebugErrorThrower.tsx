import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Mantém compatibilidade com eventos antigos de debug sem derrubar a tela.
 * As instruções agora são salvas pelo Debug Tool quando não há runtime nativo
 * de correção, evitando tela branca em produção/preview.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;
      console.warn("[debug-instruction] Evento ignorado para evitar tela branca.");
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
