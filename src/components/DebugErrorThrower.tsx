import { useEffect } from "react";
import { toast } from "sonner";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" sem derrubar a aplicação. Antes este componente
 * lançava um erro fatal intencional, mas isso causava tela branca em produção.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.info("Instrução de desenvolvimento registrada:", detail);
        toast.success("Instrução registrada para análise");
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
