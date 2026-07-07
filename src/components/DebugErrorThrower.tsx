/**
 * Mantido apenas por compatibilidade com versões antigas do app.
 * Não lança erro de runtime e não monta listeners: instruções de debug agora
 * são salvas pelo próprio formulário, evitando tela branca e cache antigo.
 */
export const DebugErrorThrower = () => null;

export default DebugErrorThrower;
