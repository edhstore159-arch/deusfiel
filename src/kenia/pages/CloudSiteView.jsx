import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function CloudSiteView() {
  const { slug } = useParams();
  const [site, setSite] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("cloud_sites")
        .select("title, html, is_public")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (error || !data) { setStatus("notfound"); return; }
      setSite(data);
      setStatus("ok");
      document.title = data.title;
    })();
  }, [slug]);

  if (status === "loading") return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (status === "notfound") return <div className="p-6 text-sm">Site não encontrado.</div>;
  return (
    <div className="min-h-screen">
      <iframe
        title={site.title}
        srcDoc={`<!doctype html><meta charset="utf-8"><title>${site.title}</title>${site.html}`}
        className="w-full min-h-screen border-0"
        sandbox="allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}
