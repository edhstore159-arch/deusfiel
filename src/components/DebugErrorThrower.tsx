import { useEffect, useState } from "react";

/**
 * Escuta instruções do Debug Tool sem derrubar a aplicação.
 * Antes este componente lançava erro fatal para abrir o overlay de debug,
 * mas isso deixava o painel em tela branca para o usuário final.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        setMessage(detail);
        try {
          sessionStorage.setItem("kenia.lastDebugInstruction", detail);
        } catch {}
      }
    };
    window.addEventListener("lovable-debug-error", handler);
    return () => window.removeEventListener("lovable-debug-error", handler);
  }, []);

  if (message) {
    console.info("Instrução de debug recebida:", message);
    queueMicrotask(() => setMessage(null));
  }

  return null;
};

export default DebugErrorThrower;
