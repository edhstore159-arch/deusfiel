import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta instruções técnicas antigas sem derrubar a interface.
 * O fluxo anterior lançava erro fatal no render e deixava a tela em branco.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.info("[debug-instruction]", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
