import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta o evento global "lovable-debug-error" e, ao receber, lança um erro
 * fatal em tempo de render contendo a instrução. Esse erro é INTENCIONAL e
 * deve escapar para o overlay global da Lovable para acionar o botão
 * "Try to Fix".
 *
 * IMPORTANTE: NÃO envolver este componente em ErrorBoundary, Suspense ou
 * qualquer boundary local. Não tratar com try/catch, toast, modal ou log.
 */
export function DebugErrorThrower() {
  const [message, setMessage] = useState<string | null>(null);
  const [thrownMessage, setThrownMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<string>;
      if (typeof custom.detail === "string" && custom.detail.length > 0) {
        setThrownMessage(null);
        setMessage(custom.detail);
      }
    };

    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => {
      window.removeEventListener("lovable-debug-error", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => {
      setMessage(null);
      setThrownMessage(message);
    }, 250);
    return () => window.clearTimeout(id);
  }, [message]);

  if (message && thrownMessage !== message) {
    // Erro intencional: deve escapar para o overlay global da Lovable.
    throw new Error(message);
  }

  return null;
}
