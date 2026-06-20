import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Mantém compatibilidade com o evento antigo "lovable-debug-error", mas não
 * derruba mais a aplicação. O fluxo anterior lançava um Error durante o render
 * e causava tela branca para usuários finais.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!message) return;
    console.info("Instrução de debug registrada sem interromper a tela.");
    setMessage(null);
  }, [message]);

  return null;
};

export default DebugErrorThrower;
