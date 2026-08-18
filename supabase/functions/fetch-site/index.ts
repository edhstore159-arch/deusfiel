const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function rewriteRelative(html, base) {
  const attrs = ["src", "href", "srcset", "poster", "data-src", "data-bg", "action", "data-original"];
  let out = html;
  for (const attr of attrs) {
    const re = new RegExp(`(${attr}=["'])([^"']+)(["'])`, "gi");
    out = out.replace(re, (m, pre, val, post) => {
      if (/^(https?:|data:|mailto:|tel:|#|javascript:|blob:)/i.test(val)) return m;
      try { return pre + new URL(val, base).href + post; } catch { return m; }
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const url = String(body.url || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timer);

    const finalUrl = res.url || url;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) {
      return new Response(JSON.stringify({ error: `O site não retornou HTML (${contentType.split(";")[0]})` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let html = await res.text();
    if (!html || html.length < 50) {
      return new Response(JSON.stringify({ error: "Conteúdo vazio ou bloqueado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = new URL(finalUrl);
    const base = baseUrl.origin + (baseUrl.pathname.replace(/[^/]*$/, "") || "/");
    html = rewriteRelative(html, base);

    let css = "";
    const linkRe = /<link[^>]*rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let lm;
    while ((lm = linkRe.exec(html)) !== null && css.length < 250000) {
      const href = lm[1];
      if (!/^https?:/i.test(href)) continue;
      try {
        const cr = await fetch(href, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
        const ct = cr.headers.get("content-type") || "";
        if (cr.ok && (ct.includes("text/css") || cr.headers.get("content-length") || cr.url.endsWith(".css"))) {
          css += "\n/* fonte: " + href + " */\n" + (await cr.text());
        }
        html = html.replace(lm[0], "");
      } catch {
        // mantém o link se não conseguir baixar
      }
    }

    let js = "";
    const scriptRe = /<script[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
    let sm;
    while ((sm = scriptRe.exec(html)) !== null && js.length < 400000) {
      const src = sm[1];
      if (!/^https?:/i.test(src)) continue;
      try {
        const sr = await fetch(src, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
        if (sr.ok) {
          const text = await sr.text();
          if (!/<\s*\/\s*script/i.test(text)) {
            js += "\n/* fonte: " + src + " */\n" + text;
            html = html.replace(sm[0], "<script>\n/* fonte: " + src + " */\n" + text + "\n</script>");
          }
        }
      } catch {
        // mantém o script original
      }
    }

    if (!/<base[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>\n<base href="${base}">`);
    }

    return new Response(JSON.stringify({ url: finalUrl, html, css, js }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String(e?.message || e);
    return new Response(JSON.stringify({ error: msg.includes("abort") ? "Tempo esgotado ao buscar o site" : `Erro ao buscar: ${msg.slice(0, 200)}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});