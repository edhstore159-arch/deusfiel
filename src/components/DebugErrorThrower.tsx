import { useEffect, useState } from "react";

/**
 * Mantém compatibilidade com eventos antigos do Debug Tool sem derrubar a UI.
 * As mensagens recebidas aqui são conteúdo do usuário e não devem virar erro fatal.
 */
export const DebugErrorThrower = () => {
  const [, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setMessage(detail);
        try {
          sessionStorage.setItem("last_debug_instruction", detail);
        } catch {
          // ignore storage failures
        }
        console.info("Debug instruction captured without crashing the app.");
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
