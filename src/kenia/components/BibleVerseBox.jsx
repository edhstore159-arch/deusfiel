import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { BookOpen, Share2, Heart, Volume2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import VERSES from "@/kenia/data/verses.json";
import boxImg from "@/assets/promise-box.png";
import natureImg from "@/assets/promise-nature.jpg";

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

function fireConfetti(originEl) {
  const rect = originEl?.getBoundingClientRect?.();
  const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
  const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5;

  const palette = ["#e8b96a", "#d99a4e", "#f5e6c8", "#ffffff", "#f7d774"];
  const base = {
    origin: { x, y },
    ticks: 180,
    gravity: 0.55,
    scalar: 0.9,
    disableForReducedMotion: true,
    colors: palette,
  };

  confetti({ ...base, particleCount: 32, spread: 70, startVelocity: 32, shapes: ["circle"] });
  confetti({ ...base, particleCount: 18, spread: 100, startVelocity: 22, scalar: 1.1, shapes: ["star"] });
  setTimeout(() => {
    confetti({ ...base, particleCount: 14, spread: 120, startVelocity: 18, scalar: 0.7, shapes: ["circle"] });
  }, 220);
}

export default function BibleVerseBox() {
  const [verse, setVerse] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | revealed
  const [favs, setFavs] = useState(loadFavs);
  const poolRef = useRef(loadPool() || VERSES.map((v) => v.id));
  const cardRef = useRef(null);
  const audioRef = useRef(null);

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

  function handleDraw() {
    if (phase === "loading") return;
    setPhase("loading");
    setVerse(null);
    setTimeout(() => {
      const v = drawVerse();
      setVerse(v);
      setPhase("revealed");
      requestAnimationFrame(() => fireConfetti(cardRef.current));
    }, 850);
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
    const text = `"${verse.texto}"\n— ${verse.livro} ${verse.capitulo}:${verse.versiculo}`;
    try {
      if (navigator.share) await navigator.share({ text, title: "Promessa de Deus" });
      else { await navigator.clipboard.writeText(text); toast.success("Versículo copiado"); }
    } catch {}
  }

  function speak() {
    if (!verse) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) { toast.error("Áudio não suportado neste navegador"); return; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(
        `${verse.livro} ${verse.capitulo}, ${verse.versiculo}. ${verse.texto}`
      );
      u.lang = "pt-BR";
      u.rate = 0.95;
      u.pitch = 1;
      synth.speak(u);
    } catch {}
  }

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);

  return (
    <div className="mx-auto w-full max-w-[520px] mb-6">
      <div className="relative overflow-hidden rounded-[28px] border border-amber-200/40 bg-gradient-to-b from-white/90 via-[#fffaf1]/90 to-[#fdf3e0]/90 p-6 sm:p-8 backdrop-blur-xl shadow-[0_20px_60px_-24px_rgba(180,140,90,0.35),0_2px_8px_-2px_rgba(180,140,90,0.15)]">
        {/* Sutil textura de luz */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 40% at 50% 0%, rgba(232,185,106,0.18), transparent 70%), radial-gradient(40% 30% at 50% 100%, rgba(232,185,106,0.10), transparent 70%)",
          }}
        />

        {/* Cabeçalho */}
        <div className="relative text-center">
          <div className="relative mx-auto h-28 w-28 sm:h-32 sm:w-32">
            {/* Glow dourado */}
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(232,185,106,0.55) 0%, rgba(232,185,106,0.15) 45%, transparent 70%)",
              }}
              animate={{
                opacity: phase === "loading" ? [0.7, 1, 0.7] : [0.5, 0.75, 0.5],
                scale: phase === "loading" ? [1, 1.15, 1] : [1, 1.05, 1],
              }}
              transition={{ duration: phase === "loading" ? 0.9 : 3.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src={boxImg}
              alt="Baú de promessas"
              width={512}
              height={512}
              loading="lazy"
              className="relative h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(180,140,90,0.35)]"
              animate={
                phase === "loading"
                  ? { rotate: [0, -6, 6, -4, 4, 0], y: [0, -3, 0] }
                  : { y: [0, -3, 0] }
              }
              transition={
                phase === "loading"
                  ? { duration: 0.85, ease: "easeInOut" }
                  : { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }
            />
          </div>

          <p className="mt-4 text-[11px] font-semibold tracking-[0.22em] text-[#c98a3b]">
            PROMESSAS DE DEUS PARA VOCÊ
          </p>
          <h2 className="mt-2 font-serif text-[22px] sm:text-[26px] leading-tight text-nude-900">
            Escolha uma promessa
            <br />
            e receba{" "}
            <span className="italic bg-gradient-to-r from-[#c98a3b] via-[#e8b96a] to-[#c98a3b] bg-clip-text text-transparent">
              direção
            </span>{" "}
            para hoje.
          </h2>
          <p className="mt-2 text-sm text-nude-600 italic">
            "A Palavra é luz para o caminho e força para o coração."
          </p>

          {/* Botão principal */}
          <motion.button
            type="button"
            onClick={handleDraw}
            disabled={phase === "loading"}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            className="group relative mt-6 inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm sm:text-base font-medium text-white shadow-[0_10px_30px_-8px_rgba(201,138,59,0.55)] disabled:opacity-70"
            style={{
              background:
                "linear-gradient(135deg,#f0c67a 0%,#e8b96a 30%,#d99a4e 65%,#c98a3b 100%)",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <Sparkles className="relative h-4 w-4" />
            <span className="relative">
              {verse ? "Receber outro versículo" : "Receber um versículo"}
            </span>
          </motion.button>
        </div>

        {/* Loading */}
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative mt-6 flex flex-col items-center justify-center py-8"
            >
              <div className="relative h-10 w-10">
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: "#e8b96a", borderRightColor: "#f0c67a" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, ease: "linear", repeat: Infinity }}
                />
                <motion.span
                  className="absolute inset-1 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(232,185,106,0.7), transparent 70%)" }}
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="mt-3 text-xs tracking-widest text-[#c98a3b]">ABRINDO A PROMESSA…</p>
            </motion.div>
          )}

          {phase === "revealed" && verse && (
            <motion.div
              key={verse.id}
              ref={cardRef}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: [0.96, 1, 1.01, 1],
              }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{
                opacity: { duration: 0.5 },
                y: { type: "spring", stiffness: 180, damping: 20 },
                scale: {
                  duration: 3.6,
                  times: [0, 0.15, 0.55, 1],
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 1.5,
                },
              }}
              className="relative mt-6 overflow-hidden rounded-2xl border border-amber-200/50 bg-white/70 p-5 shadow-[0_10px_30px_-15px_rgba(180,140,90,0.35)] backdrop-blur-md"
            >
              {/* Imagem natureza suave à direita */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full opacity-40"
                style={{
                  backgroundImage: `url(${natureImg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(6px)",
                  maskImage: "radial-gradient(circle at 70% 30%, black 30%, transparent 70%)",
                  WebkitMaskImage: "radial-gradient(circle at 70% 30%, black 30%, transparent 70%)",
                }}
              />

              <div className="relative">
                <div className="flex items-center gap-2 text-[#c98a3b]">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">
                    {verse.livro} {verse.capitulo}:{verse.versiculo}
                  </span>
                </div>
                <p className="mt-3 font-serif text-[16px] sm:text-[17px] leading-relaxed text-nude-900">
                  "{verse.texto}"
                </p>

                <div className="mt-5 border-t border-amber-200/60 pt-3 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-nude-600 inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-[#c98a3b]" />
                    Guarde esta promessa no seu coração.
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={share}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-white/70 px-3 py-1.5 text-xs text-nude-700 hover:bg-white hover:border-amber-400 transition"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Compartilhar
                    </button>
                    <button
                      type="button"
                      onClick={toggleFav}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
                        isFav
                          ? "border-pink-300 bg-pink-50 text-pink-700"
                          : "border-amber-300/60 bg-white/70 text-nude-700 hover:bg-white hover:border-amber-400"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-pink-500 text-pink-500" : ""}`} />
                      {isFav ? "Favorito" : "Favoritar"}
                    </button>
                    <button
                      type="button"
                      onClick={speak}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-white/70 px-3 py-1.5 text-xs text-nude-700 hover:bg-white hover:border-amber-400 transition"
                    >
                      <Volume2 className="h-3.5 w-3.5" /> Ouvir
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
