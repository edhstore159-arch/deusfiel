/**
 * DebugErrorThrower
 *
 * Mantido como no-op para não transformar instruções de debug em erro fatal
 * nem derrubar a tela do app em produção/preview.
 */
export const DebugErrorThrower = () => {
  return null;
};

export default DebugErrorThrower;
