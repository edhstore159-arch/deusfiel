import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Antes este componente derrubava a aplicação inteira (throw) para acionar o
 * overlay global da Lovable. Isso causava telas em branco repetidas a cada
 * instrução de debug enviada via UI. Agora apenas registramos a instrução no
 * console — o overlay/console captura o conteúdo sem destruir a árvore React.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        // Mantém visibilidade no console sem derrubar a aplicação.
        console.warn("[lovable-debug-error]", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
