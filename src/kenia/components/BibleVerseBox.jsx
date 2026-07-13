import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Share2, Heart } from "lucide-react";
import { toast } from "sonner";
import VERSES from "@/kenia/data/verses.json";

const FAV_KEY = "kenia.bible.favorites";
const POOL_KEY = "kenia.bible.pool";

function loadFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}
function loadPool() {
  try {
    const p = JSON.parse(localStorage.getItem(POOL_KEY) || "[]");
    return Array.isArray(p) && p.length ? p : null;
  } catch { return null; }
}

// Confete leve por ~60s: estrelas douradas + corações vermelhos (via emoji shapes)
function startGentleConfetti(originEl) {
  const rect = originEl?.getBoundingClientRect?.();
  const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
  const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.4;

  const heart = confetti.shapeFromText?.({ text: "❤️", scalar: 1.6 });
  const star = confetti.shapeFromText?.({ text: "⭐", scalar: 1.6 });

  const end = Date.now() + 60_000;
  const gold = ["#f5c76a", "#e8b96a", "#d99a4e", "#fff2cc"];

  const tick = () => {
    if (Date.now() > end) return;
    confetti({
      particleCount: 3,
      spread: 55,
      startVelocity: 22,
      gravity: 0.5,
      ticks: 180,
      scalar: 0.9,
      origin: { x, y },
      colors: gold,
      shapes: star ? [star] : ["star"],
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 2,
      spread: 65,
      startVelocity: 18,
      gravity: 0.45,
      ticks: 200,
      scalar: 0.9,
      origin: { x, y },
      colors: ["#e5484d"],
      shapes: heart ? [heart] : ["circle"],
      disableForReducedMotion: true,
    });
    setTimeout(tick, 420);
  };
  tick();
}

export default function BibleVerseBox() {
  const [verse, setVerse] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | revealed
  const [favs, setFavs] = useState(loadFavs);
  const poolRef = useRef(loadPool() || VERSES.map((v) => v.id));
  const boxRef = useRef(null);

  const isFav = verse && favs.includes(verse.id);

  function drawVerse() {
    let pool = poolRef.current;
    if (!pool.length) pool = VERSES.map((v) => v.id);
    const idx = Math.floor(Math.random() * pool.length);
    const id = pool[idx];
    const next = pool.filter((_, i) => i !== idx);
    poolRef.current = next;
    try { localStorage.setItem(POOL_KEY, JSON.stringify(next)); } catch {}
    return VERSES.find((v) => v.id === id);
  }

  function handleOpen() {
    if (phase === "loading") return;
    setPhase("loading");
    setVerse(null);
    setTimeout(() => {
      const v = drawVerse();
      setVerse(v);
      setPhase("revealed");
      requestAnimationFrame(() => startGentleConfetti(boxRef.current));
    }, 650);
  }

  function toggleFav() {
    if (!verse) return;
    const next = isFav ? favs.filter((x) => x !== verse.id) : [...favs, verse.id];
    setFavs(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
    toast.success(isFav ? "Removido dos favoritos" : "Guardado no coração ❤️");
  }

  async function share() {
    if (!verse) return;
    const text = `"${verse.texto}"\n— ${verse.livro} ${verse.capitulo}:${verse.versiculo}\n\n${verse.mensagem || ""}`.trim();
    try {
      if (navigator.share) await navigator.share({ text, title: "Promessa de Deus" });
      else { await navigator.clipboard.writeText(text); toast.success("Versículo copiado"); }
    } catch {}
  }

  useEffect(() => () => {
    try { confetti.reset?.(); } catch {}
  }, []);

  return (
    <div className="mx-auto w-full max-w-[300px] mb-6">
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-2xl border border-amber-200/50 bg-gradient-to-b from-white/90 to-[#fdf3e0]/90 p-4 backdrop-blur-xl shadow-[0_10px_30px_-15px_rgba(180,140,90,0.35)]"
      >
        <AnimatePresence mode="wait">
          {phase !== "revealed" && (
            <motion.button
              key="idle"
              type="button"
              onClick={handleOpen}
              disabled={phase === "loading"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.97 }}
              className="group relative flex w-full flex-col items-center gap-2 py-2 focus:outline-none"
            >
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(232,185,106,0.28), transparent 65%)",
                }}
                animate={{ opacity: phase === "loading" ? [0.6, 1, 0.6] : [0.35, 0.6, 0.35] }}
                transition={{ duration: phase === "loading" ? 0.8 : 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                className="relative text-4xl"
                animate={
                  phase === "loading"
                    ? { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.1, 1] }
                    : { y: [0, -3, 0] }
                }
                transition={
                  phase === "loading"
                    ? { duration: 0.8, ease: "easeInOut" }
                    : { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }
              >
                🎁
              </motion.span>
              <p className="relative text-[13px] font-medium text-nude-800">
                ✨ Escolha uma promessa de Deus para hoje
              </p>
            </motion.button>
          )}

          {phase === "revealed" && verse && (
            <motion.div
              key={verse.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative"
            >
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#c98a3b]">
                {verse.livro} {verse.capitulo}:{verse.versiculo}
              </p>
              <p className="mt-2 font-serif text-[14px] leading-relaxed text-nude-900">
                "{verse.texto}"
              </p>
              {verse.mensagem && (
                <p className="mt-2 text-[12px] italic text-nude-600">{verse.mensagem}</p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleOpen}
                  className="text-[11px] font-medium text-[#c98a3b] hover:underline"
                >
                  ✨ Outra promessa
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={toggleFav}
                    className={`inline-flex items-center rounded-full border p-1.5 transition ${
                      isFav
                        ? "border-pink-300 bg-pink-50 text-pink-600"
                        : "border-amber-300/60 bg-white/70 text-nude-600 hover:border-amber-400"
                    }`}
                    aria-label="Favoritar"
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-pink-500 text-pink-500" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    className="inline-flex items-center rounded-full border border-amber-300/60 bg-white/70 p-1.5 text-nude-600 hover:border-amber-400 transition"
                    aria-label="Compartilhar"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
