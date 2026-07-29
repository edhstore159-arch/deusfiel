import { useEffect, useRef, useState } from "react";
import avatarImg from "@/assets/secretary-avatar.png";
import KeniaCallButton from "@/kenia/components/KeniaCallButton";

/**
 * VirtualSecretaryAvatar
 * Assistente virtual animada (idle/speaking/walking/alerting) que mora no
 * canto do dashboard. Clique para interagir, ouve evento "kenia-alert" para
 * mostrar notificações faladas via SpeechSynthesis (pt-BR).
 */
const TIPS = [
  "Olá! Posso te ajudar com algo?",
  "Você tem tarefas pendentes hoje.",
  "Clique no microfone para falar comigo.",
  "Confira a agenda de amanhã.",
];

export default function VirtualSecretaryAvatar() {
  const [state, setState] = useState("idle"); // idle | speaking | walking | alerting
  const [bubble, setBubble] = useState("");
  const [pos, setPos] = useState({ x: 20, y: 20 }); // bottom-right offsets
  const timerRef = useRef(null);

  const speak = (_text) => {
    // Mensagens da atendente virtual de voz desativadas a pedido do usuário.
    setBubble("");
    setState("idle");
  };

  useEffect(() => {
    const onAlert = (e) => {
      const msg = (e.detail && e.detail.message) || "Tenho um aviso importante!";
      setState("alerting");
      setPos({ x: 80, y: 80 });
      setTimeout(() => speak(msg), 600);
      setTimeout(() => setPos({ x: 20, y: 20 }), 4500);
    };
    window.addEventListener("kenia-alert", onAlert);

    // Dica aleatória ocasional
    const t = setInterval(() => {
      if (state === "idle" && Math.random() < 0.25) {
        speak(TIPS[Math.floor(Math.random() * TIPS.length)]);
      }
    }, 45000);
    return () => {
      window.removeEventListener("kenia-alert", onAlert);
      clearInterval(t);
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = () => {
    // Aciona a secretária virtual completa (FloatingVoiceOrb) — abre painel,
    // libera fala e ativa o microfone com todas as funções (rotas, agenda, IA).
    const btn = document.querySelector('[data-testid="voice-orb"]');
    if (btn) (btn).click();
    speak("Estou te ouvindo. Como posso ajudar?");
  };

  return (
    <div
      className="fixed z-40 pointer-events-none select-none transition-all duration-700 ease-in-out"
      style={{ right: pos.x, bottom: pos.y + 90 }}
      aria-live="polite"
    >
      {bubble && (
        <div className="pointer-events-auto mb-2 max-w-[220px] rounded-2xl bg-white/95 px-3 py-2 text-xs text-zinc-800 shadow-lg ring-1 ring-amber-200 animate-fade-in">
          <span className="font-medium text-amber-700">Kênia</span>
          <p className="mt-0.5 leading-snug">{bubble}</p>
        </div>
      )}
      <div className="pointer-events-auto mb-2 flex justify-end">
        <KeniaCallButton />
      </div>
      <button
        type="button"
        onClick={handleClick}
        className={`pointer-events-auto group relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-amber-300/80 shadow-[0_8px_24px_rgba(212,175,55,0.45)] bg-amber-50 transition-transform hover:scale-105 ${
          state === "speaking" ? "animate-pulse" : ""
        } ${state === "alerting" ? "ring-4 ring-rose-400 animate-bounce" : ""}`}
        aria-label="Assistente virtual Kênia"
        title="Clique para interagir"
      >
        <img
          src={avatarImg}
          alt="Assistente virtual"
          width={80}
          height={80}
          loading="lazy"
          className="h-full w-full object-cover object-top secretary-breathe"
        />
        {state === "alerting" && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
            !
          </span>
        )}
      </button>
    </div>
  );
}
