import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Star, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import VERSES from "@/kenia/data/verses.json";
import arkImage from "@/kenia/assets/ark-tablets.png";

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

// Confetes leves: estrelas douradas + corações — ~60s, área contida
function GentleConfetti({ active }) {
  const items = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      kind: i % 3 === 0 ? "heart" : "star",
      x: (Math.random() - 0.5) * 260,
      xEnd: (Math.random() - 0.5) * 320,
      yStart: 40 + Math.random() * 60,
      yEnd: -260 - Math.random() * 120,
      size: 10 + Math.random() * 8,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 5,
      rot: (Math.random() - 0.5) * 120,
      opacity: 0.35 + Math.random() * 0.35,
    }));
  }, [active]);

  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {items.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2"
          style={{ fontSize: p.size, color: p.kind === "heart" ? "#e88a9a" : "#f0c56a" }}
          initial={{ x: p.x, y: p.yStart, opacity: 0, rotate: 0, scale: 0.6 }}
          animate={{
            x: [p.x, p.xEnd],
            y: [p.yStart, p.yEnd],
            opacity: [0, p.opacity, p.opacity, 0],
            rotate: [0, p.rot],
            scale: [0.6, 1, 0.9],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 4 + Math.random() * 6,
            ease: "easeOut",
          }}
        >
          {p.kind === "heart" ? "❤" : "★"}
        </motion.span>
      ))}
    </div>
  );
}

export default function BibleVerseBox() {
  const [verse, setVerse] = useState(null);
  const [phase, setPhase] = useState("closed"); // closed | opening | open
  const [favs, setFavs] = useState(loadFavs);
  const [confettiActive, setConfettiActive] = useState(false);
  const poolRef = useRef(loadPool() || VERSES.map((v) => v.id));

  const isFav = verse && favs.includes(verse.id);

  useEffect(() => {
    if (!confettiActive) return;
    const t = setTimeout(() => setConfettiActive(false), 60000);
    return () => clearTimeout(t);
  }, [confettiActive]);

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

  function openChest() {
    if (phase === "opening") return;
    setPhase("opening");
    setTimeout(() => {
      setVerse(drawVerse());
      setPhase("open");
      setConfettiActive(true);
    }, 900);
  }

  function newVerse() {
    setVerse(drawVerse());
    setConfettiActive(false);
    requestAnimationFrame(() => setConfettiActive(true));
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
      <div className="flex flex-col items-center gap-3">
        <p className="text-center text-[13px] font-medium text-nude-800">
          ✨ Escolha uma promessa de Deus para hoje
        </p>

        {/* Área do baú */}
        <div className="relative flex h-[300px] w-[300px] items-center justify-center">
          <GentleConfetti active={confettiActive} />

          {/* Halo dourado */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 55%, rgba(245,199,106,0.45), rgba(245,199,106,0) 65%)",
            }}
            animate={{
              opacity: phase === "open" ? [0.5, 0.9, 0.6] : phase === "opening" ? [0.3, 1, 0.8] : [0.25, 0.45, 0.25],
              scale: phase === "opening" ? [0.9, 1.3, 1.15] : [0.95, 1.05, 0.95],
            }}
            transition={{ duration: phase === "opening" ? 0.9 : 4, repeat: Infinity, ease: "easeInOut" }}
          />

          <AnimatePresence mode="wait">
            {phase !== "open" ? (
              <motion.button
                key="chest"
                type="button"
                onClick={openChest}
                disabled={phase === "opening"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={
                  phase === "opening"
                    ? { opacity: [1, 1, 0], scale: [1, 1.08, 1.2], x: [0, -3, 3, -2, 2, 0] }
                    : { opacity: 1, scale: 1 }
                }
                exit={{ opacity: 0, scale: 1.1 }}
                transition={
                  phase === "opening"
                    ? { duration: 0.9, ease: "easeOut" }
                    : { duration: 0.4 }
                }
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative z-20 focus:outline-none"
                aria-label="Abrir baú de promessas"
              >
                <div className="relative h-[280px] w-[280px]">
                  <motion.img
                    src={arkImage}
                    alt="Arca da Aliança"
                    width={300}
                    height={300}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_14px_28px_rgba(180,140,60,0.55)]"
                    animate={
                      phase === "opening"
                        ? { opacity: [1, 0], scale: [1, 1.12] }
                        : { opacity: 1, y: [0, -6, 0] }
                    }
                    transition={
                      phase === "opening"
                        ? { duration: 0.7, ease: "easeOut" }
                        : { y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }
                    }
                  />
                </div>
                {/* Brilho saindo durante opening */}
                {phase === "opening" && (
                  <motion.span
                    aria-hidden
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: 220,
                      height: 220,
                      background:
                        "radial-gradient(circle, rgba(255,244,200,0.95), rgba(255,220,140,0) 70%)",
                    }}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.4, 1.6, 2.1] }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                )}
              </motion.button>
            ) : (
              <motion.div
                key={verse?.id || "verse"}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 130, damping: 18 }}
                className="relative z-20 w-full rounded-2xl border border-amber-300/50 bg-white/90 p-4 backdrop-blur-xl shadow-[0_10px_30px_-12px_rgba(180,140,60,0.35)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c98a3b]">
                  {verse.livro} {verse.capitulo}:{verse.versiculo}
                </p>
                <p className="mt-2 font-serif text-[15px] leading-relaxed text-nude-900">
                  "{verse.texto}"
                </p>
                {verse.mensagem && (
                  <p className="mt-2 text-[12px] italic text-nude-600">{verse.mensagem}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Botões discretos */}
        {phase === "open" && verse && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={newVerse}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-[#c98a3b] hover:border-amber-400 transition"
            >
              <RefreshCw className="h-3 w-3" /> Novo versículo
            </button>
            <button
              type="button"
              onClick={toggleFav}
              className={`inline-flex items-center rounded-full border p-1.5 transition ${
                isFav
                  ? "border-amber-400 bg-amber-50 text-amber-600"
                  : "border-amber-300/60 bg-white/70 text-nude-600 hover:border-amber-400"
              }`}
              aria-label="Favoritar"
            >
              <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-500 text-amber-500" : ""}`} />
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center rounded-full border border-amber-300/60 bg-white/70 p-1.5 text-nude-600 hover:border-amber-400 transition"
              aria-label="Compartilhar"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
