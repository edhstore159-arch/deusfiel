import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import { api } from "@/kenia/lib/api";

const CACHE_KEY = "kenia.creatives.cache";

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function imageSrc(value) {
  if (!value) return "";
  const s = String(value);
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  return `data:image/png;base64,${s}`;
}

export default function RecentCreativesStrip() {
  // Instant hydrate from cache — no waiting on network
  const [items, setItems] = useState(() => readCache());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/creatives");
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.creatives)
          ? data.creatives
          : [];
        if (cancelled) return;
        setItems(list);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(list.slice(0, 24)));
        } catch {}
      } catch {
        // keep cached items on failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items?.length) return null;
  const shown = items.slice(0, 8);

  return (
    <div className="px-8 py-3 bg-card border-b border-nude-200 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold-600" />
          <span className="text-sm font-medium text-nude-800">Últimos criativos</span>
          <span className="text-[11px] text-nude-500">(carregamento instantâneo)</span>
        </div>
        <Link
          to="/app/creatives"
          className="text-xs text-nude-600 hover:text-nude-900 inline-flex items-center gap-1"
        >
          Ver todos <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {shown.map((it, i) => {
          const src = imageSrc(it.image_b64 || it.image || it.image_url);
          if (!src) return null;
          return (
            <Link
              key={it.id || i}
              to="/app/creatives"
              className="shrink-0 w-20 h-20 rounded-md overflow-hidden border border-nude-200 bg-nude-50 hover:ring-2 hover:ring-gold-300 transition"
              title={it.title || "Criativo"}
            >
              <img
                src={src}
                alt={it.title || "Criativo"}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
