// Busca pública de cupons promocionais para "Emergent / app.emergent.sh"
// Estratégia: consulta o HTML do DuckDuckGo (sem chave), extrai snippets,
// aplica regex para candidatos a códigos (PROMO, XXXX-9999, etc.) e devolve
// a lista com link da fonte. É melhor esforço — códigos precisam ser validados
// no checkout da plataforma.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const QUERIES = [
  '"emergent" (promo OR coupon OR cupom OR discount OR desconto) code 2026',
  'site:reddit.com emergent.sh promo code',
  '"app.emergent.sh" coupon code',
  'emergent AI credits promo code',
];

const CODE_REGEX = /\b([A-Z][A-Z0-9]{2,}(?:[-_][A-Z0-9]{2,})?|[A-Z0-9]{5,15})\b/g;
const BLOCKLIST = new Set([
  "HTTP","HTTPS","HTML","JSON","API","OPENAI","CHATGPT","GPT","AI","LLM",
  "USD","EUR","BRL","CEO","CTO","YOUTUBE","GITHUB","REDDIT","DISCORD",
  "EMERGENT","EMERGENTAI","LOVABLE","GOOGLE","META","AMAZON","AWS","SDK",
  "UI","URL","CSS","NPM","IOS","MAC","WIN","PDF","FAQ","NEWS","BLOG",
  "FREE","OFF","SALE","CODE","CODES","PROMO","COUPON","COUPONS","DEAL",
  "DEALS","2024","2025","2026","JAN","FEB","MAR","APR","MAY","JUN","JUL",
  "AUG","SEP","OCT","NOV","DEC",
]);

function extractCandidates(text: string): string[] {
  const found = new Set<string>();
  const matches = text.match(CODE_REGEX) || [];
  for (const raw of matches) {
    const m = raw.trim();
    if (m.length < 5 || m.length > 20) continue;
    if (BLOCKLIST.has(m)) continue;
    if (/^\d+$/.test(m)) continue; // só números
    if (!/[A-Z]/.test(m)) continue;
    found.add(m);
  }
  return [...found];
}

async function ddgSearch(q: string) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const resultRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = resultRe.exec(html)) !== null) {
    const rawUrl = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const snippet = m[3].replace(/<[^>]+>/g, "").trim();
    let clean = rawUrl;
    try {
      const u = new URL(rawUrl, "https://duckduckgo.com");
      const uddg = u.searchParams.get("uddg");
      if (uddg) clean = decodeURIComponent(uddg);
    } catch { /* ignore */ }
    results.push({ title, url: clean, snippet });
  }
  return results;
}

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const results = await Promise.all(
      QUERIES.map((q) => withTimeout(ddgSearch(q), 8000, [] as Array<{ title: string; url: string; snippet: string }>)),
    );
    const all = results.flatMap((r) => r.slice(0, 6));

    const seen = new Set<string>();
    type Candidate = { code: string; sources: Array<{ title: string; url: string; snippet: string }> };
    const map = new Map<string, Candidate>();

    for (const r of all) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      const text = `${r.title} ${r.snippet}`.toUpperCase();
      const codes = extractCandidates(text);
      for (const code of codes) {
        const entry = map.get(code) || { code, sources: [] };
        if (entry.sources.length < 3) entry.sources.push(r);
        map.set(code, entry);
      }
    }

    const candidates = [...map.values()]
      .sort((a, b) => b.sources.length - a.sources.length)
      .slice(0, 30);

    return new Response(JSON.stringify({
      ok: true,
      generatedAt: new Date().toISOString(),
      candidates,
      sources: all.slice(0, 20),
      disclaimer: "Códigos extraídos automaticamente da web pública. Precisam ser testados no checkout — não há garantia de validade.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
