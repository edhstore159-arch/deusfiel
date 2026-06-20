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
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent("site:jusbrasil.com.br " + q)}`;
    const r = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    const html = await r.text();
    const decode = (s: string) => s
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    // Cada resultado: class="result__a" href="..." > título; snippet em class="result__snippet"
    const blockRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = blockRe.exec(html)) && results.length < 6) {
      let href = decode(m[1]);
      const u = href.match(/uddg=([^&]+)/);
      if (u) href = decodeURIComponent(u[1]);
      if (!/jusbrasil\.com\.br/.test(href)) continue;
      const title = decode(m[2].replace(/<[^>]+>/g, "")).trim();
      const snippet = decode(m[4].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim().slice(0, 280);
      results.push({ title, url: href, snippet });
    }
    const summary = results.length
      ? results.map((x, i) => `${i + 1}. ${x.title}\n   ${x.url}\n   ${x.snippet}`).join("\n\n")
      : "Nenhum resultado encontrado no Jusbrasil.";
    return new Response(JSON.stringify({ query: q, source_url: `https://www.jusbrasil.com.br/busca?q=${encodeURIComponent(q)}`, results, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
