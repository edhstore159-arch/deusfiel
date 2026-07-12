import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Mantém compatibilidade com telas antigas que disparam o evento
 * "lovable-debug-error", mas não derruba mais a aplicação com uma exceção
 * durante o render. O lançamento fatal causava tela branca no preview.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;

      window.dispatchEvent(
        new CustomEvent("lovable-debug-error-received", {
          detail: { received: true, length: detail.length },
        })
      );
    };

    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  return null;
};

export default DebugErrorThrower;
