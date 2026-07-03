import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/kenia/components/ui/dialog";
import { Button } from "@/kenia/components/ui/button";
import { Box, Sparkles, RotateCw, MousePointer2 } from "lucide-react";

/**
 * Immersive3DViewer
 * - Modo 3D: parallax/tilt seguindo o mouse (CSS 3D transforms), com camada de brilho
 *   e profundidade dupla (frente/atrás) para dar sensação de volume.
 * - Modo 4D: adiciona a dimensão do tempo — auto-rotação contínua + pulsação de
 *   profundidade e mudança de iluminação ao longo do ciclo.
 * Implementação 100% CSS/DOM (sem WebGL) para funcionar em qualquer navegador.
 */
export default function Immersive3DViewer({ open, image, title, onClose }) {
  const [mode, setMode] = useState("3d"); // '3d' | '4d'
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [t, setT] = useState(0);
  const wrapRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => { if (!open) { setMode("3d"); setTilt({ rx: 0, ry: 0 }); } }, [open]);

  // Animação 4D (tempo)
  useEffect(() => {
    if (!open || mode !== "4d") return;
    const start = performance.now();
    const loop = (now) => {
      setT((now - start) / 1000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, mode]);

  const onMove = (e) => {
    if (mode === "4d") return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -y * 25, ry: x * 30 });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0 });

  const rx = mode === "4d" ? Math.sin(t * 0.9) * 18 : tilt.rx;
  const ry = mode === "4d" ? Math.cos(t * 0.7) * 28 : tilt.ry;
  const depth = mode === "4d" ? 40 + Math.sin(t * 1.3) * 25 : 30;
  const glowX = 50 + ry * 1.2;
  const glowY = 50 - rx * 1.2;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-4xl bg-nude-950 text-white border-nude-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Box className="w-4 h-4 text-gold-400" />
            Visualização imersiva {mode === "4d" ? "4D (animada)" : "3D (interativa)"} — {title || "criativo"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Button size="sm" variant={mode === "3d" ? "default" : "outline"} onClick={() => setMode("3d")}
            className={mode === "3d" ? "bg-gold-600 hover:bg-gold-700 text-white" : "border-nude-700 text-nude-200 hover:bg-nude-900"}>
            <MousePointer2 className="w-3.5 h-3.5 mr-1" /> 3D interativo
          </Button>
          <Button size="sm" variant={mode === "4d" ? "default" : "outline"} onClick={() => setMode("4d")}
            className={mode === "4d" ? "bg-gold-600 hover:bg-gold-700 text-white" : "border-nude-700 text-nude-200 hover:bg-nude-900"}>
            <RotateCw className="w-3.5 h-3.5 mr-1" /> 4D animado
          </Button>
        </div>

        <div
          ref={wrapRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="relative w-full aspect-square rounded-xl overflow-hidden select-none"
          style={{
            perspective: "1400px",
            background: "radial-gradient(circle at 50% 30%, #2a2418 0%, #0a0906 70%)",
          }}
        >
          {image ? (
            <div
              className="absolute inset-6 rounded-lg transition-transform duration-100 ease-out"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${depth}px)`,
              }}
            >
              {/* Camada de fundo (profundidade traseira) */}
              <img src={image} alt="" aria-hidden
                className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-30 blur-md"
                style={{ transform: "translateZ(-60px) scale(1.05)" }} />
              {/* Imagem principal */}
              <img src={image} alt={title || "criativo"}
                className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-2xl"
                style={{ transform: "translateZ(0px)" }} />
              {/* Brilho especular reagindo à posição */}
              <div className="absolute inset-0 rounded-lg pointer-events-none mix-blend-overlay"
                style={{
                  background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,220,150,0.55), transparent 55%)`,
                  transform: "translateZ(20px)",
                }} />
              {/* Moldura destacada */}
              <div className="absolute inset-0 rounded-lg pointer-events-none border border-gold-400/40"
                style={{ transform: "translateZ(30px)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.7)" }} />
            </div>
          ) : (
            <div className="w-full h-full grid place-items-center text-nude-500">
              <Sparkles className="w-8 h-8" />
            </div>
          )}
        </div>

        <p className="text-xs text-nude-400 text-center mt-3">
          {mode === "3d"
            ? "Passe o mouse sobre a imagem para inclinar em 3D."
            : "4D = 3D + tempo: rotação e profundidade animadas automaticamente."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
