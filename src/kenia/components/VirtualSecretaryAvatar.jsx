import { useEffect, useRef, useState } from "react";
import Secretary3DAvatar from "@/kenia/components/Secretary3DAvatar";

const TIPS = [
  "Olá! Posso te ajudar com algo?",
  "Você tem tarefas pendentes hoje.",
  "Clique em mim para falar comigo.",
  "Confira a agenda de amanhã.",
];

export default function VirtualSecretaryAvatar() {
  const [state, setState] = useState("idle"); // idle | speaking | walking | alerting
  const [bubble, setBubble] = useState("");
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const timerRef = useRef(null);
  const mouthOpenRef = useRef(0);
  const mouthAnimRef = useRef(null);

  const startMouthAnim = () => {
    cancelAnimationFrame(mouthAnimRef.current);
    const tick = () => {
      // pseudo lip-sync: random envelope while speaking
      mouthOpenRef.current = 0.25 + Math.random() * 0.6;
      mouthAnimRef.current = requestAnimationFrame(tick);
    };
    tick();
  };
  const stopMouthAnim = () => {
    cancelAnimationFrame(mouthAnimRef.current);
    mouthOpenRef.current = 0;
  };

  const speak = (text) => {
    setBubble(text);
    setState("speaking");
    startMouthAnim();
    try {
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "pt-BR";
        u.rate = 1.02;
        u.pitch = 1.1;
        const voices = window.speechSynthesis.getVoices?.() || [];
        const ptVoice = voices.find((v) => /pt[-_]BR/i.test(v.lang) && /female|maria|luciana|fernanda/i.test(v.name)) || voices.find((v) => /pt[-_]BR/i.test(v.lang));
        if (ptVoice) u.voice = ptVoice;
        u.onend = () => { stopMouthAnim(); setState("idle"); };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch {}
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      stopMouthAnim();
      setBubble("");
      setState("idle");
    }, 7000);
  };

  useEffect(() => {
    const onAlert = (e) => {
      const msg = (e.detail && e.detail.message) || "Tenho um aviso importante!";
      setState("alerting");
      setPos({ x: 80, y: 80 });
      setTimeout(() => speak(msg), 500);
      setTimeout(() => setPos({ x: 20, y: 20 }), 4500);
    };
    window.addEventListener("kenia-alert", onAlert);

    const t = setInterval(() => {
      if (state === "idle" && Math.random() < 0.2) {
        speak(TIPS[Math.floor(Math.random() * TIPS.length)]);
      }
    }, 60000);
    return () => {
      window.removeEventListener("kenia-alert", onAlert);
      clearInterval(t);
      clearTimeout(timerRef.current);
      cancelAnimationFrame(mouthAnimRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = () => {
    const btn = document.querySelector('[data-testid="voice-orb"]');
    if (btn) btn.click();
    speak("Estou te ouvindo. Como posso ajudar?");
  };

  return (
    <div
      className="fixed z-40 pointer-events-none select-none transition-all duration-700 ease-in-out"
      style={{ right: pos.x, bottom: pos.y + 90 }}
      aria-live="polite"
    >
      {bubble && (
        <div className="pointer-events-auto mb-2 max-w-[240px] rounded-2xl bg-white/95 px-3 py-2 text-xs text-zinc-800 shadow-lg ring-1 ring-amber-200 animate-fade-in">
          <span className="font-medium text-amber-700">Kênia</span>
          <p className="mt-0.5 leading-snug">{bubble}</p>
        </div>
      )}
      <div className="pointer-events-auto">
        <Secretary3DAvatar
          state={state}
          mouthOpenRef={mouthOpenRef}
          onClick={handleClick}
        />
      </div>
    </div>
  );
}
