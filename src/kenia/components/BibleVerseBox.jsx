import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Heart, Sparkles } from "lucide-react";
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

// Poeira de ouro — 40-60 partículas nascendo no centro, subindo e caindo suavemente
function StardustBurst({ trigger }) {
  const particles = useMemo(() => {
    const n = 50;
    const types = ["star", "star", "dot", "dot", "sparkle"];
    const colors = ["#f5c76a", "#e8b96a", "#fff2cc", "#ffffff", "#f0d68c", "#d9b57a"];
    return Array.from({ length: n }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 110;
      const x = Math.cos(angle) * dist;
      const yUp = -20 - Math.random() * 50;
      const yDown = yUp + 60 + Math.random() * 80;
      return {
        id: i,
        type: types[i % types.length],
        color: colors[i % colors.length],
        size: 3 + Math.random() * 6,
        x,
        yUp,
        yDown,
        delay: Math.random() * 0.25,
        duration: 1.4 + Math.random() * 0.6,
        rot: (Math.random() - 0.5) * 180,
      };
    });
  }, [trigger]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-visible">
      {particles.map((p) => (
        <motion.span
          key={`${trigger}-${p.id}`}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            color: p.color,
            filter: "drop-shadow(0 0 4px rgba(245,199,106,0.7))",
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: [0, p.x * 0.6, p.x],
            y: [0, p.yUp, p.yDown],
            opacity: [0, 1, 0],
            scale: [0.4, 1, 0.2],
            rotate: [0, p.rot],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {p.type === "star" ? (
            <svg viewBox="0 0 24 24" width={p.size * 2} height={p.size * 2} fill="currentColor">
              <path d="M12 2l2.4 6.9L21.6 10l-5.6 4.4L18 21.6 12 17.6 6 21.6l2-7.2L2.4 10l7.2-1.1z" />
            </svg>
          ) : p.type === "sparkle" ? (
            <svg viewBox="0 0 24 24" width={p.size * 2} height={p.size * 2} fill="currentColor">
              <path d="M12 0l1.5 8.5L22 10l-8.5 1.5L12 20l-1.5-8.5L2 10l8.5-1.5z" />
            </svg>
          ) : (
            <span
              className="block rounded-full"
              style={{ width: p.size, height: p.size, background: p.color }}
            />
          )}
        </motion.span>
      ))}
    </div>
  );
}

export default function BibleVerseBox() {
  const [verse, setVerse] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | revealed
  const [favs, setFavs] = useState(loadFavs);
  const [burstKey, setBurstKey] = useState(0);
  const [glow, setGlow] = useState(false);
  const poolRef = useRef(loadPool() || VERSES.map((v) => v.id));

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
      setBurstKey((k) => k + 1);
      setGlow(true);
      setTimeout(() => setGlow(false), 1200);
    }, 800);
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

  return (
    <div className="mx-auto w-full max-w-[320px] mb-6">
      <motion.div
        animate={
          phase === "revealed"
            ? { scale: [1, 1.01, 1] }
            : { scale: 1 }
        }
        transition={
          phase === "revealed"
            ? { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }
            : { duration: 0.3 }
        }
        className="relative overflow-visible rounded-2xl border p-4 backdrop-blur-xl"
        style={{
          borderColor: glow ? "rgba(245,199,106,0.9)" : "rgba(232,185,106,0.4)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(253,243,224,0.9))",
          boxShadow: glow
            ? "0 0 32px -4px rgba(245,199,106,0.55), 0 10px 30px -15px rgba(180,140,90,0.35)"
            : "0 10px 30px -15px rgba(180,140,90,0.35)",
          transition: "box-shadow 600ms ease, border-color 600ms ease",
        }}
      >
        {phase === "revealed" && <StardustBurst trigger={burstKey} />}

        <AnimatePresence mode="wait">
          {phase !== "revealed" && (
            <motion.button
              key="idle"
              type="button"
              onClick={handleOpen}
              disabled={phase === "loading"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              whileTap={{ scale: 0.96 }}
              className="group relative flex w-full flex-col items-center gap-2 py-2 focus:outline-none"
            >
              {/* golden shine sweep on click */}
              {phase === "loading" && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.span
                    className="absolute top-0 h-full w-1/2"
                    style={{
                      background:
                        "linear-gradient(100deg, transparent, rgba(255,236,170,0.85), transparent)",
                    }}
                    initial={{ x: "-120%" }}
                    animate={{ x: "220%" }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                </motion.span>
              )}

              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(232,185,106,0.28), transparent 65%)",
                }}
                animate={{ opacity: phase === "loading" ? [0.5, 1, 0.5] : [0.3, 0.55, 0.3] }}
                transition={{ duration: phase === "loading" ? 0.9 : 3.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* baú com feixe de luz durante loading */}
              <div className="relative">
                {phase === "loading" && (
                  <motion.span
                    aria-hidden
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: 80,
                      height: 80,
                      background:
                        "radial-gradient(circle, rgba(255,236,170,0.9), rgba(245,199,106,0) 70%)",
                    }}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.6, 1.4, 1.8] }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                )}
                <motion.span
                  className="relative block text-4xl"
                  animate={
                    phase === "loading"
                      ? { y: [0, -4, 0], scale: [1, 1.08, 1] }
                      : { y: [0, -3, 0] }
                  }
                  transition={
                    phase === "loading"
                      ? { duration: 0.8, ease: "easeInOut" }
                      : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
                  }
                >
                  🎁
                </motion.span>

                {/* partículas douradas girando durante loading */}
                {phase === "loading" && (
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ width: 90, height: 90 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                  >
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const a = (i / 6) * Math.PI * 2;
                      return (
                        <span
                          key={i}
                          className="absolute rounded-full"
                          style={{
                            width: 4,
                            height: 4,
                            left: 45 + Math.cos(a) * 38 - 2,
                            top: 45 + Math.sin(a) * 38 - 2,
                            background: "#f5c76a",
                            boxShadow: "0 0 8px rgba(245,199,106,0.9)",
                            opacity: 0.4 + (i / 6) * 0.6,
                          }}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </div>

              <p className="relative text-[13px] font-medium text-nude-800">
                ✨ Escolha uma promessa de Deus para hoje
              </p>
            </motion.button>
          )}

          {phase === "revealed" && verse && (
            <motion.div
              key={verse.id}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.9 }}
              className="relative z-10"
            >
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#c98a3b]">
                {verse.livro} {verse.capitulo}:{verse.versiculo}
              </p>
              <p className="mt-2 font-serif text-[15px] leading-relaxed text-nude-900">
                "{verse.texto}"
              </p>
              {verse.mensagem && (
                <p className="mt-2 text-[12px] italic text-nude-600">{verse.mensagem}</p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleOpen}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#c98a3b] hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> Receber outra promessa
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
      </motion.div>
    </div>
  );
}
