import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Antes este componente transformava instruções de debug em erro fatal.
 * Isso derrubava o app inteiro e causava tela branca no preview.
 * Agora ele apenas registra a mensagem para diagnóstico, sem interromper a UI.
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

  if (message) {
    console.warn("lovable-debug-error capturado sem derrubar o app:", message);
  }

  return null;
};

export default DebugErrorThrower;
