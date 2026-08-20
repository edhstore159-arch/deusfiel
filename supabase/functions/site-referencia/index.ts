const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const GENRE_PRESETS: Record<string, string> = {
  esportes: "site moderno de esportes — hero escuro com gradiente, cards de modalidades, placares/tabelas em destaque, seção de atletas com fotos, cores vibrantes (verde/lima, laranja) sobre fundo escuro, tipografia bold condensada, navbar fixa.",
  advocacia: "site premium de escritório de advocacia — paleta sóbria (azul-marinho, dourado), tipografia serifada elegante, hero institucional, seções de áreas de atuação em cards, depoimentos, formulário de contato, rodapé completo.",
  restaurante: "site apetitoso de restaurante — fundo escuro com fotos de pratos grandes, tipografia display, menu em cards com preços, reservas com CTA, seção de avaliações, paleta quente (vermelho/laranja/âmbar).",
  imobiliaria: "site clean de imobiliária — paleta neutra com destaque verde/esmeralda, grid de imóveis com fotos e preços, filtros de busca, seções de localização e depoimentos, tipografia geométrica.",
  academia: "site energético de academia — fundo escuro com fotos de treinos, destaques em vermelho/amarelo neon, planos em cards, contador de membros, seção de treinadores.",
  moda: "site elegante de moda — paleta minimalista (branco, bege, preto), tipografia fina com espaçamento, imagens grandes, layout editorial, hover com zoom.",
  saude: "site confiável de saúde — paleta verde-água e branco, cards arredondados, fotos de equipe médica, seções de especialidades, depoimentos, agendamento.",
  tecnologia: "site futurista de tecnologia — fundo escuro com gradientes neon (azul/roxo), glassmorphism, animações fade-in, seção de recursos, métricas, CTA gradiente.",
  saas: "SaaS/app premium dark — design system em variáveis CSS, fundo com radial-gradient, fonte display para títulos, cards rounded-2xl com borda e sombra, botões rounded-xl, inputs rounded-2xl, animação fade-in-up.",
  igreja: "site acolhedor de igreja — paleta dourada e madeira/branco, tipografia serifada, seção de cultos, galeria, versículo em destaque, formulário.",
  agencia: "site criativo de agência digital — fundo claro com gradientes coloridos, tipografia bold grande, portfólio em grid com hover, marcas em carrossel, serviços em cards.",
};

const FAMOUS_SITES: Record<string, Array<{name: string; url: string}>> = {
  esportes: [
    { name: "ESPN", url: "https://www.espn.com" },
    { name: "Nike", url: "https://www.nike.com" },
    { name: "Adidas", url: "https://www.adidas.com" },
    { name: "Under Armour", url: "https://www.underarmour.com" },
  ],
  advocacia: [
    { name: "Pinheiro Neto", url: "https://www.pinheironeto.com.br" },
    { name: "TozziniFreire", url: "https://www.tozzinifreire.com.br" },
    { name: "Skadden", url: "https://www.skadden.com" },
    { name: "White & Case", url: "https://www.whitecase.com" },
  ],
  restaurante: [
    { name: "Fogo de Chão", url: "https://fogodechao.com.br" },
    { name: "Outback", url: "https://www.outback.com" },
    { name: "Nando's", url: "https://www.nandos.co.uk" },
    { name: "Madero", url: "https://www.madero.com.br" },
  ],
  imobiliaria: [
    { name: "Zillow", url: "https://www.zillow.com" },
    { name: "CBRE", url: "https://www.cbre.com" },
    { name: "Lopes", url: "https://www.lopes.com.br" },
    { name: "Redfin", url: "https://www.redfin.com" },
  ],
  academia: [
    { name: "Equinox", url: "https://www.equinox.com" },
    { name: "Gold's Gym", url: "https://www.goldsgym.com" },
    { name: "Smart Fit", url: "https://www.smartfit.com.br" },
    { name: "CrossFit", url: "https://www.crossfit.com" },
  ],
  moda: [
    { name: "Zara", url: "https://www.zara.com" },
    { name: "H&M", url: "https://www.hm.com" },
    { name: "Renner", url: "https://www.lojasrenner.com.br" },
    { name: "Net-a-Porter", url: "https://www.net-a-porter.com" },
  ],
  saude: [
    { name: "Mayo Clinic", url: "https://www.mayoclinic.org" },
    { name: "Einstein", url: "https://www.einstein.br" },
    { name: "Fleury", url: "https://www.fleury.com.br" },
    { name: "Dasa", url: "https://www.dasa.com.br" },
  ],
  tecnologia: [
    { name: "Stripe", url: "https://stripe.com" },
    { name: "Linear", url: "https://linear.app" },
    { name: "Vercel", url: "https://vercel.com" },
    { name: "Supabase", url: "https://supabase.com" },
  ],
  saas: [
    { name: "Stripe", url: "https://stripe.com" },
    { name: "Linear", url: "https://linear.app" },
    { name: "Notion", url: "https://www.notion.so" },
    { name: "Slack", url: "https://slack.com" },
  ],
  igreja: [
    { name: "Elevation Church", url: "https://elevationchurch.org" },
    { name: "Hillsong", url: "https://hillsong.com" },
    { name: "Gateway Church", url: "https://gatewaypeople.com" },
    { name: "LDS Church", url: "https://www.churchofjesuschrist.org" },
  ],
  agencia: [
    { name: "R/GA", url: "https://www.rga.com" },
    { name: "Futura", url: "https://www.futura.com.br" },
    { name: "TBWA", url: "https://www.tbwa.com" },
    { name: "Wieden+Kennedy", url: "https://www.wk.com" },
  ],
};

const GENRE_PATTERNS = [
  { re: /esport|futebol|fitness|academia|basquete|clube|gym/i, key: "esportes" },
  { re: /advocaci|juridic|advogad|escritorio de|law/i, key: "advocacia" },
  { re: /restaurant|comida|pizza|lanchonete|delivery|bufe|confeitaria|padaria|food/i, key: "restaurante" },
  { re: /imobiliar|imovel|apartamento|casa|corretor|empreendimento|real estate/i, key: "imobiliaria" },
  { re: /academia|personal|treino|fitness|musculacao|crossfit|gym/i, key: "academia" },
  { re: /moda|roupa|loja de|vestuario|estilista|sapatos|fashion/i, key: "moda" },
  { re: /clinica|saude|medico|dentista|hospital|fisioterapia|psicolog|health/i, key: "saude" },
  { re: /tecnologia|startup|software|aplicativo|ti |sistema|inteligencia artificial|tech/i, key: "tecnologia" },
  { re: /saas|app |aplicativo|plataforma|radar|marketplace|dashboard|ferramenta/i, key: "saas" },
  { re: /igreja|crist[aã]o|crente|ministerio|culto|evangelic|catolic|paroquia|b[ií]blia|jesus|gospel|adorac|capela|church/i, key: "igreja" },
  { re: /agencia|criativ|marketing|digital|publicidade|design|agency/i, key: "agencia" },
];

function detectGenre(prompt: string): string {
  for (const p of GENRE_PATTERNS) {
    if (p.re.test(prompt)) return p.key;
  }
  return "";
}

function extractDeepBlueprint(html: string, url: string): string {
  if (!html || html.length < 200) return "";
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim().slice(0, 100) || "";
  const desc = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i) || [])[1]?.trim().slice(0, 200) || "";
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const cssRaw = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).join(" ");

  const colorCounts: Record<string, number> = {};
  (body.match(/#[0-9a-fA-F]{3,8}\b/g) || []).forEach((c) => {
    const k = c.toLowerCase().slice(0, 7);
    colorCounts[k] = (colorCounts[k] || 0) + 1;
  });
  const colors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);

  const rgbColors = [...new Set((body.match(/rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\)/gi) || []))].slice(0, 6);

  const gradients = [...new Set((cssRaw.match(/background(?:-image)?\s*:\s*(linear-gradient|radial-gradient)[^;]{10,80}/gi) || []))].slice(0, 4).map((g) => g.replace(/background(?:-image)?\s*:\s*/i, "").trim().slice(0, 80));

  const fontRaw = (body.match(/font-family\s*:\s*([^;}]{2,50})/gi) || []).concat(cssRaw.match(/font-family\s*:\s*([^;}]{2,50})/gi) || []);
  const fontList: string[] = [];
  for (const fx of fontRaw) {
    const name = fx.replace(/font-family\s*:\s*/i, "").split(",")[0].trim().replace(/['"]/g, "").slice(0, 30);
    if (name && !["sans-serif", "serif", "monospace", "cursive", "system-ui"].includes(name.toLowerCase()) && !fontList.includes(name)) fontList.push(name);
  }
  const fonts = fontList.slice(0, 5);

  const fontSizes = [...new Set((cssRaw.match(/font-size\s*:\s*\d+(?:\.\d+)?(?:px|rem|em)/gi) || []))].slice(0, 8).map((f) => f.replace(/font-size\s*:\s*/i, ""));
  const fontWeights = [...new Set((cssRaw.match(/font-weight\s*:\s*\d{3}/gi) || []))].slice(0, 5).map((f) => f.replace(/font-weight\s*:\s*/i, ""));

  const headings = [...body.matchAll(/<(h[1-6])[^>]*>([\s\S]{0,120}?)<\/\1>/gi)]
    .map((m) => `${m[1]}: ${m[2].replace(/<[^>]+>/g, "").trim().slice(0, 80)}`)
    .filter(Boolean)
    .slice(0, 16);

  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]{20,200}?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, "").trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 8);

  const hasNav = /<nav\b|<header\b/i.test(body);
  const hasHero = /hero|banner|jumbotron|hero-section|hero-section/i.test(body);
  const hasCards = /card|feature|servi[çc]o|product|grid/i.test(body);
  const hasStats = /stat|n[uú]mero|metric|counter|count/i.test(body);
  const hasTestimonials = /testimonial|depoiment|review|aval/i.test(body);
  const hasPricing = /pricing|planos|pre[çc]o|mensalidade|assinatura/i.test(body);
  const hasFaq = /faq|perguntas|accordion|duvidas/i.test(body);
  const hasForm = /<form\b/i.test(body);
  const hasGallery = /galer|gallery|portfolio|projetos/i.test(body);
  const hasFooter = /<footer\b/i.test(body);
  const hasVideo = /<video|youtube|vimeo/i.test(body);
  const hasMap = /maps|google.*map|iframe.*map/i.test(body);

  const ctas: string[] = [];
  for (const m of body.matchAll(/<button[^>]*>([\s\S]{0,60}?)<\/button>/gi)) {
    const t = m[1].replace(/<[^>]+>/g, "").trim();
    if (t && t.length < 40 && !ctas.includes(t)) ctas.push(t);
  }
  for (const m of body.matchAll(/<a[^>]*(?:btn|button|cta)[^>]*>([\s\S]{0,60}?)<\/a>/gi)) {
    const t = m[1].replace(/<[^>]+>/g, "").trim();
    if (t && t.length < 40 && !ctas.includes(t)) ctas.push(t);
  }

  const radii = [...new Set((cssRaw.match(/border-radius\s*:\s*[\d.]+(?:px|rem|%)/gi) || []))].slice(0, 8).map((r) => r.replace(/border-radius\s*:\s*/i, ""));
  const paddings = [...new Set((cssRaw.match(/padding\s*:\s*[\d.]+(?:px|rem|em)/gi) || []))].slice(0, 8).map((p) => p.replace(/padding\s*:\s*/i, ""));
  const margins = [...new Set((cssRaw.match(/margin(?:-(?:top|bottom|left|right))?\s*:\s*[\d.]+(?:px|rem|em|auto)/gi) || []))].slice(0, 6).map((m) => m.trim());
  const shadows = [...new Set((cssRaw.match(/box-shadow\s*:\s*[^;]{5,60}/gi) || []))].slice(0, 4).map((s) => s.replace(/box-shadow\s*:\s*/i, "").trim().slice(0, 50));
  const responsive = /@media\s*\(/i.test(cssRaw);
  const animations = [...new Set((cssRaw.match(/(?:animation|transition)\s*:\s*[^;]{5,60}/gi) || []))].slice(0, 4).map((a) => a.trim().slice(0, 50));
  const cssVars = [...new Set((cssRaw.match(/--[\w-]+\s*:\s*[^;]{2,40}/gi) || []))].slice(0, 10).map((v) => v.trim());

  const imgs = [...body.matchAll(/<img[^>]*(?:alt=["']([^"']{2,60})["'])?[^>]*>/gi)]
    .map((m) => ({ alt: m[1] || "", src: (m[0].match(/src=["']([^"']+)/i) || [])[1] || "" }))
    .filter((i) => i.alt)
    .slice(0, 12);
  const imgCount = (body.match(/<img\b/gi) || []).length;

  const links = [...body.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,60}?)<\/a>/gi)]
    .map((m) => ({ href: m[1].slice(0, 60), text: m[2].replace(/<[^>]+>/g, "").trim().slice(0, 40) }))
    .filter((l) => l.text && l.text.length > 1 && l.text.length < 30)
    .slice(0, 12);

  const sections: string[] = [];
  if (hasNav) sections.push("navbar/header");
  if (hasHero) sections.push("hero");
  if (hasStats) sections.push("estatísticas");
  if (hasCards) sections.push("cards/features");
  if (hasGallery) sections.push("galeria/portfólio");
  if (hasTestimonials) sections.push("depoimentos");
  if (hasPricing) sections.push("planos/preços");
  if (hasFaq) sections.push("FAQ");
  if (hasForm) sections.push("formulário");
  if (hasVideo) sections.push("vídeo");
  if (hasMap) sections.push("mapa/localização");
  if (hasFooter) sections.push("footer");

  let brief = `MODELO DE REFERÊNCIA: ${url}`;
  if (title) brief += `\nTÍTULO: "${title}"`;
  if (desc) brief += `\nDESCRIÇÃO: ${desc}`;
  brief += `\n\nCORES (por frequência): ${colors.join(", ") || "não detectada"}`;
  if (rgbColors.length) brief += `\nCORES RGB: ${rgbColors.join(", ")}`;
  if (gradients.length) brief += `\nGRADIENTES: ${gradients.join(" | ")}`;
  brief += `\n\nFONTES: ${fonts.join(", ") || "não detectadas"}`;
  if (fontSizes.length) brief += `\nTAMANHOS: ${fontSizes.join(", ")}`;
  if (fontWeights.length) brief += `\nPESOS: ${fontWeights.join(", ")}`;
  brief += `\n\nSEÇÕES (ordem): ${sections.join(" → ") || "não detectadas"}`;
  brief += `\nESTRUTURA: ${sections.join(", ")}`;
  if (ctas.length) brief += `\nBOTÕES/CTAs: ${ctas.join(", ")}`;
  if (links.length) brief += `\nNAVEGAÇÃO: ${links.map((l) => l.text).join(", ")}`;
  if (headings.length) brief += `\nTÍTULOS: ${headings.slice(0, 10).join(" | ")}`;
  if (paragraphs.length) brief += `\nTEXTOS: ${paragraphs.slice(0, 5).join(" | ")}`;
  if (radii.length) brief += `\nBORDAS ARREDONDADAS: ${radii.join(", ")}`;
  if (paddings.length) brief += `\nPADDINGS: ${paddings.join(", ")}`;
  if (margins.length) brief += `\nMARGENS: ${margins.join(", ")}`;
  if (shadows.length) brief += `\nSOBRAS: ${shadows.join(" | ")}`;
  if (animations.length) brief += `\nANIMAÇÕES: ${animations.join(" | ")}`;
  if (cssVars.length) brief += `\nCSS VARS: ${cssVars.join(", ")}`;
  brief += `\nRESPONSIVO: ${responsive ? "SIM (media queries)" : "NÃO"}`;
  brief += `\nTOTAL: ${headings.length} títulos, ${imgCount} imagens${imgs.length ? `, imagens: ${imgs.map((i) => i.alt).join(", ")}` : ""}`;
  brief += `\n\nINSTRUÇÃO DE FIDELIDADE: Ao gerar este site, REPRODUZA EXATAMENTE esta paleta de cores, fontes, tamanhos, pesos, espaçamentos, bordas, sombras, gradientes, animações, ordem de seções, textos dos botões, títulos e textos. O site gerado deve parecer IDÊNTICO ao modelo de referência em termos de design, cores, tipografia e estrutura.`;

  return brief;
}

function scoreHtml(html: string): number {
  if (!html || html.length < 1000) return 0;
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  let s = 0;
  s += Math.min(12, (body.match(/<h[1-3]\b/gi) || []).length);
  s += Math.min(10, (body.match(/<img\b/gi) || []).length);
  s += ((body.match(/<nav\b|<header\b/i) || []).length) * 3;
  s += ((body.match(/<footer\b/i) || []).length) * 3;
  s += ((body.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length > 6 ? 4 : 0);
  s += (/@media\s*\(/i.test(html) ? 3 : 0);
  s += ((body.match(/<form\b/i) || []).length) * 2;
  s += ((body.match(/<section\b/i) || []).length) * 2;
  s += ((body.match(/animation|transition/gi) || []).length > 2 ? 2 : 0);
  s += ((body.match(/box-shadow/gi) || []).length > 1 ? 2 : 0);
  s += ((body.match(/linear-gradient|radial-gradient/gi) || []).length > 1 ? 2 : 0);
  return s;
}

async function searchLite(q: string): Promise<string[]> {
  const url = "https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(q);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  const links: string[] = [];
  const re = /<a[^>]*rel="nofollow"[^>]*href="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(html) !== null && links.length < 10)) {
    const href = m[1];
    if (/^https?:\/\//i.test(href) && !/duckduckgo\.com|youtube\.com|facebook\.com|instagram\.com|twitter\.com|t\.me|pinterest|tiktok/i.test(href)) {
      links.push(href);
    }
  }
  return links;
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8", "Accept": "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(4000),
    });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("html")) return null;
    const html = await res.text();
    if (!html || html.length < 1000) return null;
    return html.slice(0, 150000);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").slice(0, 300);
    const genre = detectGenre(prompt);
    const preset = genre ? GENRE_PRESETS[genre] : "";

    const allBriefs: Array<{ brief: string; url: string; score: number; name: string }> = [];

    if (genre && FAMOUS_SITES[genre]) {
      const results = await Promise.allSettled(
        FAMOUS_SITES[genre].map(async (famous) => {
          const html = await tryFetch(famous.url);
          if (!html) return null;
          const score = scoreHtml(html);
          const b = extractDeepBlueprint(html, famous.url);
          if (b.length > 100 && score > 5) {
            return { brief: b, url: famous.url, score, name: famous.name };
          }
          return null;
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          allBriefs.push(r.value);
        }
      }
      allBriefs.sort((a, b) => b.score - a.score);
    }

    if (allBriefs.length === 0) {
      const queries = [
        `${genre ? preset.slice(0, 60) : prompt} melhor site design award premiado 2024 2025`,
        `${genre ? preset.slice(0, 60) : prompt} website inspiração top profissional`,
      ];
      for (const query of queries) {
        const links = await searchLite(query);
        const searchResults = await Promise.allSettled(
          links.slice(0, 5).map(async (link) => {
            const html = await tryFetch(link);
            if (!html) return null;
            const score = scoreHtml(html);
            const b = extractDeepBlueprint(html, link);
            if (b.length > 100 && score > 5) {
              return { brief: b, url: link, score, name: "" };
            }
            return null;
          })
        );
        for (const r of searchResults) {
          if (r.status === "fulfilled" && r.value) {
            allBriefs.push(r.value);
          }
        }
        if (allBriefs.length >= 2) break;
      }
      allBriefs.sort((a, b) => b.score - a.score);
    }

    let brief = "";
    if (allBriefs.length > 0) {
      const top = allBriefs[0];
      brief = top.name
        ? `Use como referência o site ${top.name} (${top.url}), mundialmente reconhecido:\n\n${top.brief}`
        : `Referência encontrada na internet (${top.url}):\n\n${top.brief}`;

      if (allBriefs.length > 1) {
        const second = allBriefs[1];
        brief += `\n\nSEGUNDA REFERÊNCIA (${second.name || second.url}):\n${second.brief.slice(0, 1500)}`;
      }
    } else if (preset) {
      brief = `DIREÇÃO DE DESIGN: ${preset}`;
    }

    return new Response(JSON.stringify({ genre, searchedUrl: allBriefs[0]?.url || "", source: allBriefs.length > 0 ? "web" : "preset", score: allBriefs[0]?.score || 0, brief, referencesFound: allBriefs.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e).slice(0, 200) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
