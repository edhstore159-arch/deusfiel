import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta "lovable-debug-error" e, durante o render seguinte, lança um
 * Error fatal contendo a instrução. Isso é INTENCIONAL: o objetivo é
 * cair no overlay global de erro da Lovable para que o botão
 * "Try to Fix" receba a instrução, sem passar pela sidebar/chat.
 *
 * NÃO envolver em ErrorBoundary/Suspense.
 * NÃO substituir o throw por toast, log, modal, try/catch ou boundary.
 */
export const DebugErrorThrower = () => {
  // Disabled: previously threw a render-time error on a custom event,
  // which crashed the app with prompt-injected messages.
  return null;
};

export default DebugErrorThrower;
