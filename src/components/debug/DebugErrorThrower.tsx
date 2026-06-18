import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o evento global "lovable-debug-error" e registra a instrução sem
 * lançar erro durante o render. Lançar dentro do render derruba a árvore React
 * inteira e deixa a prévia em tela branca.
 */
export function DebugErrorThrower() {
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<string>;
      if (typeof custom.detail === "string" && custom.detail.length > 0) {
        console.warn("Debug instruction captured:", custom.detail);
      }
    };

    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => {
      window.removeEventListener("lovable-debug-error", handler as EventListener);
    };
  }, []);

  return null;
}
