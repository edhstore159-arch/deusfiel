import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query } = await req.json().catch(() => ({ query: "" }));
    const q = String(query || "").trim();
    if (!q) {
      return new Response(JSON.stringify({ error: "missing query" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = `https://www.jusbrasil.com.br/busca?q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    const html = await r.text();
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const re = /<a[^>]+href="(https:\/\/www\.jusbrasil\.com\.br\/[^"]+)"[^>]*>([^<]{15,200})<\/a>/g;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < 8) {
      const u = m[1].split("?")[0];
      const t = m[2].replace(/&[a-z]+;/g, " ").trim();
      if (seen.has(u) || /\/busca\b|\/topicos\/?$/.test(u)) continue;
      seen.add(u);
      // snippet: pega 240 chars de texto após o link
      const idx = m.index + m[0].length;
      const tail = html.slice(idx, idx + 800).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
      results.push({ title: t, url: u, snippet: tail });
    }
    const summary = results.length
      ? results.map((x, i) => `${i + 1}. ${x.title}\n   ${x.url}\n   ${x.snippet}`).join("\n\n")
      : "Nenhum resultado encontrado no Jusbrasil.";
    return new Response(JSON.stringify({ query: q, source_url: url, results, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
