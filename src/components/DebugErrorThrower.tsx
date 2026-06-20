import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Mantém compatibilidade com o evento legado "lovable-debug-error", mas
 * nunca lança erro durante o render. O fluxo antigo derrubava a tela inteira
 * do app sempre que a ferramenta de debug era acionada.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.info("Debug instruction captured without crashing the app.");
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
