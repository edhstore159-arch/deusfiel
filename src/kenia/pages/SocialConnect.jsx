import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SocialConnections from "@/kenia/components/SocialConnections";
import { Share2, ImageIcon, Wand2, CalendarClock, Sparkles, ArrowRight, BarChart3 } from "lucide-react";
import { api } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";

export default function SocialConnect() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/creatives");
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.creatives) ? data.creatives : [];
        const seen = new Set();
        const unique = list.filter((it) => {
          const key = it?.id || it?.storage_path || (it?.image_b64 || it?.image_url || it?.url || "").slice(0, 128);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setItems(unique);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const imageSrc = (value) => {
    const s = String(value || "");
    if (!s) return "";
    if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:")) return s;
    return `data:image/png;base64,${s}`;
  };
  const srcOf = (it) => imageSrc(it?.image_b64 || it?.image_url || it?.url || it?.image || it?.signedUrl || "");

  return (
    <div className="h-full flex flex-col bg-nude-50">
      {/* Hero header */}
      <div className="px-6 pt-6 pb-8 bg-gradient-to-b from-nude-900 to-nude-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-gold-400 text-[10px] uppercase tracking-widest font-semibold mb-2">
            <Share2 className="w-3 h-3" /> Marketing · Multi-Plataforma
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white flex items-center gap-3">
            Conectar Redes Sociais
          </h1>
          <p className="text-sm text-nude-400 mt-2 max-w-2xl">
            Autorize o acesso OAuth às suas contas para agendar e publicar automaticamente.
            Todas as conexões são seguras e você pode desconectar a qualquer momento.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3 mt-5">
            <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-2.5 border border-white/10">
              <div className="text-[10px] text-nude-400 uppercase tracking-wider">Criativos prontos</div>
              <div className="text-lg font-bold text-white">{items.length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-2.5 border border-white/10">
              <div className="text-[10px] text-nude-400 uppercase tracking-wider">Redes suportadas</div>
              <div className="text-lg font-bold text-white">8</div>
            </div>
            <Link to="/app/creatives/gallery">
              <div className="bg-gold-600/20 backdrop-blur rounded-lg px-4 py-2.5 border border-gold-500/30 hover:bg-gold-600/30 transition-colors cursor-pointer">
                <div className="text-[10px] text-gold-300 uppercase tracking-wider">Galeria</div>
                <div className="text-lg font-bold text-gold-100 flex items-center gap-1">
                  Ver criativos <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Connection dashboard */}
          <SocialConnections />

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/app/creatives">
              <Card className="p-4 border-nude-200 hover:border-gold-300 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-100 grid place-items-center group-hover:bg-gold-200 transition-colors">
                    <Sparkles className="w-5 h-5 text-gold-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-nude-900">Gerar Criativos</div>
                    <div className="text-[11px] text-nude-500">Crie posts com IA para suas redes</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-nude-400 ml-auto group-hover:text-gold-500 transition-colors" />
                </div>
              </Card>
            </Link>
            <Link to="/app/creatives/gallery">
              <Card className="p-4 border-nude-200 hover:border-gold-300 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-100 grid place-items-center group-hover:bg-gold-200 transition-colors">
                    <CalendarClock className="w-5 h-5 text-gold-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-nude-900">Agendar Posts</div>
                    <div className="text-[11px] text-nude-500">Programe publicações recorrentes</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-nude-400 ml-auto group-hover:text-gold-500 transition-colors" />
                </div>
              </Card>
            </Link>
            <Link to="/app/analytics">
              <Card className="p-4 border-nude-200 hover:border-gold-300 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-100 grid place-items-center group-hover:bg-gold-200 transition-colors">
                    <BarChart3 className="w-5 h-5 text-gold-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-nude-900">Ver Métricas</div>
                    <div className="text-[11px] text-nude-500">Acompanhe engajamento e alcance</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-nude-400 ml-auto group-hover:text-gold-500 transition-colors" />
                </div>
              </Card>
            </Link>
          </div>

          {/* Recent creatives */}
          {items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-serif font-semibold text-nude-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gold-500" />
                  Criativos recentes
                  <Badge variant="secondary" className="text-[10px] ml-1">{items.length}</Badge>
                </h2>
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to="/app/creatives/gallery">Ver todos <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.slice(0, 8).map((it, idx) => {
                  const src = srcOf(it);
                  return (
                    <Card key={it.id || `c-${idx}`} className="overflow-hidden border-nude-200 hover:shadow-sm transition-all">
                      {src ? (
                        <img src={src} alt={it.title || `Criativo ${idx + 1}`} className="w-full h-36 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-36 bg-nude-100 flex items-center justify-center text-nude-400 text-xs">Sem imagem</div>
                      )}
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-nude-800 truncate">{it.title || "Sem título"}</p>
                        {it.network && (
                          <Badge variant="secondary" className="text-[9px] mt-1">{it.network}</Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
