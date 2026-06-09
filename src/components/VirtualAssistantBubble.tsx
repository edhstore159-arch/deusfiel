import avatar from "@/assets/virtual-assistant.png";

/**
 * Bolinha flutuante da atendente virtual.
 * Ao clicar, abre o ChatGPT em uma nova aba para consultas livres
 * (resolver problemas, dar dicas, etc.).
 */
export const VirtualAssistantBubble = () => {
  const handleClick = () => {
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Abrir ChatGPT para ajuda"
      title="Abrir ChatGPT"
      className="fixed left-5 bottom-5 z-50 h-14 w-14 rounded-full overflow-hidden ring-2 ring-gold-400 shadow-lg shadow-nude-900/30 hover:scale-105 active:scale-95 transition-transform bg-white"
      data-testid="virtual-assistant-bubble"
    >
      <img
        src={avatar}
        alt="Atendente virtual"
        width={56}
        height={56}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </button>
  );
};

export default VirtualAssistantBubble;
