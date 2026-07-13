import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SocialConnections from "@/kenia/components/SocialConnections";
import { Share2, ImageIcon, Wand2 } from "lucide-react";
import { api } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";

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
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6">
        <h1 className="text-2xl font-serif font-bold text-gold-100 flex items-center gap-2">
          <Share2 className="w-6 h-6 text-gold-400" />
          Conectar Redes Sociais
        </h1>
        <p className="text-sm text-nude-400 mt-1">
          Conecte cada conta para liberar o agendamento automático dos posts (fusão e criativos).
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="max-w-5xl mx-auto">
          <SocialConnections />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-serif font-semibold text-gold-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-gold-400" />
              Criativos gerados ({items.length})
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/creatives/gallery"><Wand2 className="w-4 h-4 mr-2" /> Abrir galeria</Link>
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-nude-400">Carregando…</p>
          ) : items.length === 0 ? (
            <Card className="p-6 text-center text-sm text-nude-400 bg-nude-900/60 border-gold-900/40">
              Nenhum criativo gerado ainda. Vá para <Link to="/app/creatives" className="text-gold-400 underline">Criativos</Link> ou <Link to="/app/image-fusion" className="text-gold-400 underline">Fusão de Imagens</Link>.
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((it, idx) => {
                const src = srcOf(it);
                return (
                  <Card key={it.id || `c-${idx}`} className="overflow-hidden bg-nude-900/60 border-gold-900/40">
                    {src ? (
                      <img src={src} alt={it.title || `Criativo ${idx + 1}`} className="w-full h-48 object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-48 bg-nude-800 flex items-center justify-center text-nude-500 text-xs">Sem imagem</div>
                    )}
                    <div className="p-3">
                      <p className="text-sm text-gold-100 truncate">{it.title || "Sem título"}</p>
                      <Button asChild size="sm" className="w-full mt-2" variant="outline">
                        <Link to="/app/creatives/gallery">Agendar publicação</Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
