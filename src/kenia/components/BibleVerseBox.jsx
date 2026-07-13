import { useMemo, useRef, useState } from "react";
import { Share2, Heart, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import VERSES from "@/kenia/data/verses.json";
import boxImg from "@/assets/promise-box.png";

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

export default function BibleVerseBox() {
  const [verse, setVerse] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | shaking | revealed
  const [flipped, setFlipped] = useState(false);
  const [favs, setFavs] = useState(loadFavs);
  const poolRef = useRef(loadPool() || VERSES.map((v) => v.id));

  const isFav = verse && favs.includes(verse.id);

  const particles = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 0.8,
      size: 4 + Math.random() * 6,
    })),
    [verse?.id]
  );

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
    if (phase === "shaking") return;
    setFlipped(false);
    setPhase("shaking");
    setTimeout(() => {
      const v = drawVerse();
      setVerse(v);
      setPhase("revealed");
      setTimeout(() => setFlipped(true), 400);
    }, 900);
  }

  function toggleFav() {
    if (!verse) return;
    const next = isFav ? favs.filter((x) => x !== verse.id) : [...favs, verse.id];
    setFavs(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
    toast.success(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
  }

  async function share() {
    if (!verse) return;
    const text = `"${verse.texto}"\n— ${verse.livro} ${verse.capitulo}:${verse.versiculo}`;
    try {
      if (navigator.share) await navigator.share({ text, title: "Palavra para o seu coração" });
      else { await navigator.clipboard.writeText(text); toast.success("Versículo copiado"); }
    } catch {}
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#e8d5b7] bg-gradient-to-br from-[#fffaf3] via-[#fdf2e6] to-[#f9e4ec] p-5 shadow-[0_8px_30px_-12px_rgba(180,140,90,0.25)]">
      <style>{`
        @keyframes kbox-shake {
          0%,100%{transform:rotate(0) translateY(0)}
          15%{transform:rotate(-6deg) translateY(-2px)}
          30%{transform:rotate(6deg) translateY(-4px)}
          45%{transform:rotate(-5deg) translateY(-2px)}
          60%{transform:rotate(5deg) translateY(-3px)}
          80%{transform:rotate(-3deg) translateY(-1px)}
        }
        @keyframes kcard-out {
          0%{transform:translateY(20px) scale(.6);opacity:0}
          60%{transform:translateY(-8px) scale(1);opacity:1}
          100%{transform:translateY(0) scale(1);opacity:1}
        }
        @keyframes ksparkle {
          0%{opacity:0;transform:translateY(0) scale(.3)}
          40%{opacity:1;transform:translateY(-14px) scale(1)}
          100%{opacity:0;transform:translateY(-30px) scale(.4)}
        }
        .kbox-shake{animation:kbox-shake .9s ease-in-out}
        .kcard-out{animation:kcard-out .5s ease-out both}
        .kcard-flip{transform-style:preserve-3d;transition:transform 1s cubic-bezier(.4,.2,.2,1)}
        .kcard-flip.is-flipped{transform:rotateY(180deg)}
        .kface{backface-visibility:hidden;-webkit-backface-visibility:hidden}
        .kback{transform:rotateY(180deg)}
        .ksparkle{animation:ksparkle 1.4s ease-out forwards}
      `}</style>

      <div className="text-center">
        <div className="relative mx-auto h-32 w-32 sm:h-36 sm:w-36">
          <img
            src={boxImg}
            alt="Caixa de promessas"
            width={768}
            height={768}
            loading="lazy"
            className={`h-full w-full object-contain drop-shadow-[0_10px_15px_rgba(180,140,90,0.35)] ${phase === "shaking" ? "kbox-shake" : ""}`}
          />
          {phase === "revealed" && (
            <div className="pointer-events-none absolute inset-0">
              {particles.map((p) => (
                <span
                  key={p.id}
                  className="ksparkle absolute rounded-full bg-yellow-300"
                  style={{
                    left: `${p.left}%`,
                    top: `${p.top}%`,
                    width: p.size,
                    height: p.size,
                    animationDelay: `${p.delay}s`,
                    boxShadow: "0 0 8px rgba(253,224,71,0.9)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <p className="mt-3 font-serif text-nude-800 text-base sm:text-lg">
          Escolha uma promessa de Deus para hoje.
        </p>

        <button
          type="button"
          onClick={handleDraw}
          disabled={phase === "shaking"}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#e8b96a] via-[#d99a4e] to-[#c98a3b] px-6 py-3 text-sm sm:text-base font-medium text-white shadow-md shadow-amber-700/20 hover:brightness-110 active:scale-[.98] transition disabled:opacity-70"
        >
          <Sparkles className="h-4 w-4" />
          {verse ? "Retirar outro versículo" : "Retirar um Versículo"}
        </button>
      </div>

      {phase === "revealed" && verse && (
        <div className="mt-5 kcard-out" style={{ perspective: 1200 }}>
          <div className={`kcard-flip relative min-h-[190px] w-full ${flipped ? "is-flipped" : ""}`}>
            {/* Frente (verso do cartão fechado) */}
            <div className="kface absolute inset-0 rounded-2xl border border-[#e8d5b7] bg-gradient-to-br from-[#fff7ea] to-[#fce4ec] p-5 shadow-inner flex items-center justify-center">
              <span className="font-serif italic text-nude-500">Sua promessa…</span>
            </div>
            {/* Verso — versículo */}
            <div className="kface kback absolute inset-0 rounded-2xl border border-[#e8d5b7] bg-gradient-to-br from-white via-[#fffaf3] to-[#e6f0fa] p-5 shadow-inner">
              <div className="flex items-center gap-2 text-[#c98a3b] text-sm font-medium">
                📖 <span>{verse.livro} {verse.capitulo}:{verse.versiculo}</span>
              </div>
              <p className="mt-3 font-serif text-nude-900 leading-relaxed text-[15px] sm:text-base">
                {verse.texto}
              </p>
              <div className="mt-4 border-t border-[#e8d5b7] pt-3 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-nude-600">❤️ Palavra para o seu coração.</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={share}
                    className="inline-flex items-center gap-1 rounded-full border border-[#e8d5b7] bg-white/70 px-3 py-1.5 text-xs text-nude-700 hover:bg-white"
                    aria-label="Compartilhar"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Compartilhar
                  </button>
                  <button
                    type="button"
                    onClick={toggleFav}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${isFav ? "border-pink-300 bg-pink-50 text-pink-700" : "border-[#e8d5b7] bg-white/70 text-nude-700 hover:bg-white"}`}
                    aria-label="Favoritar"
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-pink-500 text-pink-500" : ""}`} />
                    {isFav ? "Favorito" : "Favoritar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDraw}
                    className="inline-flex items-center gap-1 rounded-full border border-[#e8d5b7] bg-white/70 px-3 py-1.5 text-xs text-nude-700 hover:bg-white"
                    aria-label="Outro versículo"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Outro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
