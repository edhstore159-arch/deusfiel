const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const imgMap = new Map();

const MAX_IMAGES = 20;
const MAX_TOTAL_BYTES = 1200000;
const MAX_PER_IMAGE = 200000;

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

const collectedUrls = new Set();

function collectImageUrls(html, css) {
  const urls = [];
  const add = (u) => {
    if (!/^https?:/i.test(u)) return;
    if (!collectedUrls.has(u) && !imgMap.has(u)) { collectedUrls.add(u); urls.push(u); }
  };
  const attrRe = /(src|poster|data-src|data-bg)=["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) add(m[2]);
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const first = m[1].split(",")[0].trim().split(/\s+/)[0];
    add(first);
  }
  const styleRe = /style=["'][^"']*url\((["']?)([^)"']+)\1\)/gi;
  while ((m = styleRe.exec(html)) !== null) add(m[2].trim());
  const cssRe = /url\((["']?)([^)"']+)\1\)/gi;
  while ((m = cssRe.exec(css)) !== null) add(m[2].trim());
  return urls;
}

async function downloadImages(urls) {
  const results = [];
  let downloaded = 0;
  let totalBytes = 0;
  const batch = 8;
  for (let i = 0; i < urls.length && downloaded < MAX_IMAGES; i += batch) {
    const chunk = urls.slice(i, i + batch);
    const done = await Promise.all(chunk.map(async (u) => {
      if (downloaded >= MAX_IMAGES) return null;
      try {
        const r = await fetch(u, {
          headers: { "User-Agent": UA, "Referer": "https://www.google.com/", "Accept": "image/*,*/*;q=0.8" },
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) return null;
        const buf = await r.arrayBuffer();
        if (!buf.byteLength || buf.byteLength > MAX_PER_IMAGE) return null;
        if (totalBytes + buf.byteLength > MAX_TOTAL_BYTES) return null;
        const ct = r.headers.get("content-type") || "image/jpeg";
        const bytes = new Uint8Array(buf);
        let bin = "";
        const CH = 0x8000;
        for (let j = 0; j < bytes.length; j += CH) bin += String.fromCharCode(...bytes.subarray(j, j + CH));
        return { u, data: `data:${ct};base64,${btoa(bin)}`, size: buf.byteLength };
      } catch {
        return null;
      }
    }));
    for (const d of done) {
      if (d) { results.push(d); downloaded++; totalBytes += d.size; }
    }
  }
  for (const d of results) imgMap.set(d.u, d.data);
  return results.length;
}

function inlineImages(html, css) {
  let out = html;
  out = out.replace(/(src|poster|data-src|data-bg)=["']([^"']+)["']/gi, (m, attr, val) =>
    imgMap.has(val) ? `${attr}="${imgMap.get(val)}"` : m);
  out = out.replace(/srcset=["'][^"']*["']/gi, (m) => {
    const val = m.slice(8, -1);
    let replaced = false;
    const parts = val.split(",").map((p) => p.trim());
    const newParts = parts.map((p) => {
      const sp = p.split(/\s+/);
      if (imgMap.has(sp[0])) { replaced = true; return `${imgMap.get(sp[0])} ${sp.slice(1).join(" ")}`.trim(); }
      return p;
    });
    return replaced ? `srcset="${newParts.join(", ")}"` : m;
  });
  out = out.replace(/(style=["'])([^"']*)(["'])/gi, (m, pre, style, post) => {
    if (!/url\(/i.test(style)) return m;
    let changed = false;
    const ns = style.replace(/url\((["']?)([^)"']+)\1\)/gi, (u, q, url) => {
      const uu = url.trim();
      if (imgMap.has(uu)) { changed = true; return `url(${q}${imgMap.get(uu)}${q})`; }
      return u;
    });
    return changed ? pre + ns + post : m;
  });
  let ncss = css;
  if (css && /url\(/i.test(css)) {
    ncss = css.replace(/url\((["']?)([^)"']+)\1\)/gi, (u, q, url) => {
      const uu = url.trim();
      return imgMap.has(uu) ? `url(${q}${imgMap.get(uu)}${q})` : u;
    });
  }
  return { html: out, css: ncss };
}

async function fetchPage(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const finalUrl = res.url || url;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("html")) return null;

  let html = await res.text();
  if (!html || html.length < 50) return null;

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
      if (cr.ok && (ct.includes("text/css") || cr.url.endsWith(".css"))) {
        css += "\n/* fonte: " + href + " */\n" + (await cr.text());
      }
      html = html.replace(lm[0], "");
    } catch {
      // mantém o link original
    }
  }

  let js = "";
  let jsBytes = 0;
  const scriptRe = /<script[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let sm;
  let inlinedCount = 0;
  while ((sm = scriptRe.exec(html)) !== null && inlinedCount < 10) {
    const src = sm[1];
    if (!/^https?:/i.test(src)) { scriptRe.lastIndex = sm.index + sm[0].length; continue; }
    try {
      const sr = await fetch(src, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (sr.ok) {
        const text = await sr.text();
        if (text.length < 800000) {
          const safe = text.replace(/<\/script/gi, "<\\x3C/script");
          const inline = "<script>\n/* fonte: " + src + " */\n" + safe + "\n</script>";
          html = html.slice(0, sm.index) + inline + html.slice(sm.index + sm[0].length);
          scriptRe.lastIndex = sm.index + inline.length;
          if (jsBytes < 300000) {
            const take = Math.min(safe.length, 300000 - jsBytes);
            js += "\n/* fonte: " + src + " */\n" + safe.slice(0, take);
            jsBytes += take;
          }
          inlinedCount++;
          continue;
        }
      }
    } catch {
      // mantém o script original
    }
    scriptRe.lastIndex = sm.index + sm[0].length;
  }

  const urls = collectImageUrls(html, css);
  if (urls.length > 0) await downloadImages(urls);
  const inlined = inlineImages(html, css);
  html = inlined.html;
  css = inlined.css;

  if (!/<base[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n<base href="${base}">`);
  }

  return { url: finalUrl, html, css, js };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const url = String(body.url || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ ok: false, error: "URL inválida" }), {
        status: 200,
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
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: `Site bloqueou o acesso (HTTP ${res.status})` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) {
      return new Response(JSON.stringify({ ok: false, error: `O site não retornou HTML (${contentType.split(";")[0]})` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mainHtml = await res.text();
    if (!mainHtml || mainHtml.length < 50) {
      return new Response(JSON.stringify({ ok: false, error: "Conteúdo vazio ou bloqueado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = new URL(finalUrl).origin;

    const paths = [];
    if (body.crawl) {
      const seen = new Set(["/", "/index.html"]);
      const linkRe = /<a[^>]*href=["']([^"']+)["']/gi;
      let m;
      while ((m = linkRe.exec(mainHtml)) !== null) {
        const val = m[1];
        if (!val.startsWith(origin)) continue;
        const path = val.slice(origin.length).split("#")[0].split("?")[0];
        if (!path) continue;
        const norm = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
        if (!seen.has(norm)) {
          seen.add(norm);
          paths.push(norm);
        }
        if (seen.size >= 10) break;
      }
    }

    const pages = [];
    const seenCss = new Set();
    const seenJs = new Set();
    const seenHtml = new Set();

    const mainPage = await fetchPage(finalUrl);
    if (mainPage) {
      pages.push({ path: "/", ...mainPage });
      seenHtml.add(mainPage.html);
      if (mainPage.css) seenCss.add(mainPage.css);
      if (mainPage.js) seenJs.add(mainPage.js);
    } else {
      pages.push({ path: "/", html: mainHtml, css: "", js: "" });
      seenHtml.add(mainHtml);
    }

    for (const p of paths) {
      try {
        const page = await fetchPage(origin + p);
        if (page) {
          if (seenHtml.has(page.html)) continue;
          seenHtml.add(page.html);
          const out = { path: p, url: page.url, html: page.html };
          if (page.css && !seenCss.has(page.css)) { seenCss.add(page.css); out.css = page.css; } else { out.css = ""; }
          if (page.js && !seenJs.has(page.js)) { seenJs.add(page.js); out.js = page.js; } else { out.js = ""; }
          pages.push(out);
        }
      } catch {
        // página inacessível — ignora
      }
      if (pages.length >= 10) break;
    }

    return new Response(JSON.stringify({
      ok: true,
      scraped: pages.length > 0,
      url: finalUrl,
      origin,
      pages,
      html: pages[0].html,
      css: pages[0].css,
      js: pages[0].js,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String(e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: msg.includes("abort") ? "Tempo esgotado ao buscar o site" : `Erro ao buscar: ${msg.slice(0, 200)}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});