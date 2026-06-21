import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e converte a instrução em erro fatal de runtime,
 * para escapar até o overlay global da Lovable e habilitar o "Try to Fix".
 *
 * NÃO envolver em ErrorBoundary/Suspense. NÃO trocar throw por console/log.
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
    // Não derruba mais a aplicação: a instrução já fica registrada no estado/logs.
    // Isso evita tela em branco quando o debug é acionado dentro do preview.
    console.info("Instrução de debug recebida:", message);
  }

  return null;
};

export default DebugErrorThrower;
