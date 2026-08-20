const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Mapeamento de nichos para sites de referência mundialmente reconhecidos
const NICHE_FAMOUS: Record<string, Array<{name: string; url: string; why: string}>> = {
  restaurante: [
    { name: "Fogo de Chão", url: "https://fogodechao.com.br", why: "churrascaria premium, fundo escuro, dourado, hero grande" },
    { name: "Nando's UK", url: "https://www.nandos.co.uk", why: "design moderno, cores vibrantes, cards criativos" },
    { name: "Madero", url: "https://www.madero.com.br", why: "hambúrguer artesanal, hero com parallax, escuro" },
    { name: "Outback", url: "https://www.outback.com", why: "restaurante casual, design acolhedor, menu visual" },
    { name: "The Cheesecake Factory", url: "https://www.thecheesecakefactory.com", why: "menu extenso, fotos de pratos, layout sofisticado" },
  ],
  advocacia: [
    { name: "Pinheiro Neto", url: "https://www.pinheironeto.com.br", why: "escritório top Brasil, azul-marinho, serifada, premium" },
    { name: "Skadden", url: "https://www.skadden.com", why: "global law firm, minimalista, azul escuro, elegante" },
    { name: "White & Case", url: "https://www.whitecase.com", why: "internacional, tipografia bold, limpo" },
    { name: "Mattos Filho", url: "https://www.mattosfilho.com.br", why: "escritório brasileiro, design sóbrio, dourado" },
  ],
  academia: [
    { name: "Equinox", url: "https://www.equinox.com", why: "luxury fitness, escuro, neon, energia" },
    { name: "CrossFit", url: "https://www.crossfit.com", why: "vermelho/preto, bold, ativo, community" },
    { name: "Smart Fit", url: "https://www.smartfit.com.br", why: "academia BR, app integration, planos" },
    { name: "Gold's Gym", url: "https://www.goldsgym.com", why: "clássico, amarelo/preto, forte" },
  ],
  imobiliaria: [
    { name: "Zillow", url: "https://www.zillow.com", why: "maior portal imobiliário, search filters, grid de imóveis" },
    { name: "CBRE", url: "https://www.cbre.com", why: "corretora global, paleta neutra, premium" },
    { name: "Lopes", url: "https://www.lopes.com.br", why: "maior corretora BR, verde, limpo" },
    { name: "Redfin", url: "https://www.redfin.com", why: "tecnologia + imobiliário, vermelho, moderno" },
  ],
  moda: [
    { name: "Zara", url: "https://www.zara.com", why: "minimalista, preto/branco, editorial, hero fullscreen" },
    { name: "Net-a-Porter", url: "https://www.net-a-porter.com", why: "luxo, tipografia fina, grid elegante" },
    { name: "Gucci", url: "https://www.gucci.com", why: "high fashion, artístico, bold colors" },
    { name: "Renner", url: "https://www.lojasrenner.com.br", why: "moda BR, acessível, grid de produtos" },
  ],
  saude: [
    { name: "Mayo Clinic", url: "https://www.mayoclinic.org", why: "referência mundial, azul/verde, confiança" },
    { name: "Einstein", url: "https://www.einstein.br", why: "hospital BR, moderno, agendamento" },
    { name: "Dasa", url: "https://www.dasa.com.br", why: "diagnósticos BR, clean, digital" },
    { name: "Cleveland Clinic", url: "https://my.clevelandclinic.org", why: "top hospital, UX limpo, patient portal" },
  ],
  tecnologia: [
    { name: "Stripe", url: "https://stripe.com", why: "SaaS premium, gradientes, animações, glassmorphism" },
    { name: "Linear", url: "https://linear.app", why: "dark mode, minimalista, tipografia precisa" },
    { name: "Vercel", url: "https://vercel.com", why: "dark, geometric, clean code aesthetic" },
    { name: "Supabase", url: "https://supabase.com", why: "dark, neon green, developer-friendly" },
    { name: "Figma", url: "https://www.figma.com", why: "design tool, colorful, playful but pro" },
  ],
  saas: [
    { name: "Stripe", url: "https://stripe.com", why: "SaaS premium, gradientes, animações" },
    { name: "Notion", url: "https://www.notion.so", why: "clean, white, block-based, minimal" },
    { name: "Slack", url: "https://slack.com", why: "colorful, friendly, feature showcase" },
    { name: "HubSpot", url: "https://www.hubspot.com", why: "CRM, orange/gradiente, CTA forte" },
    { name: "Cal.com", url: "https://cal.com", why: "dark, scheduling, developer-first" },
  ],
  igreja: [
    { name: "Elevation Church", url: "https://elevationchurch.org", why: "mega church, video hero, moderno" },
    { name: "Hillsong", url: "https://hillsong.com", why: "global, artístico, video background" },
    { name: "LDS Church", url: "https://www.churchofjesuschrist.org", why: "institucional, dourado, limpo" },
    { name: "Gateway Church", url: "https://gatewaypeople.com", why: "comunidade, acolhedor, CTA de doação" },
  ],
  agencia: [
    { name: "R/GA", url: "https://www.rga.com", why: "criativa, bold, case studies" },
    { name: "Wieden+Kennedy", url: "https://www.wk.com", why: "icônica, minimalista, impacto" },
    { name: "Futura", url: "https://www.futura.com.br", why: "agência BR, portfólio, criativa" },
    { name: "IDEO", url: "https://www.ideo.com", why: "design thinking, clean, innovation" },
  ],
  barbearia: [
    { name: "Blind Barber", url: "https://blindbarber.com", why: "barbershop moderno, dark, masculino" },
    { name: "Squire", url: "https://www.squire.com", why: "tech + barbershop, dark, app" },
    { name: "Booksy", url: "https://booksy.com", why: "agendamento, marketplace, clean" },
  ],
  pet: [
    { name: "Chewy", url: "https://www.chewy.com", why: "pet shop online, amigável, colorful" },
    { name: "Petco", url: "https://www.petco.com", why: "pet store, verde, cuidado" },
    { name: "Cobasi", url: "https://www.cobasi.com.br", why: "pet BR, completo, grid de produtos" },
  ],
  ecomerce: [
    { name: "Shopify", url: "https://www.shopify.com", why: "e-commerce platform, green, clean" },
    { name: "Amazon", url: "https://www.amazon.com", why: "referência e-commerce, grid, search" },
    { name: "Magazine Luiza", url: "https://www.magazineluiza.com.br", why: "e-commerce BR, azul, promoções" },
    { name: "Mercado Livre", url: "https://www.mercadolivre.com.br", why: "marketplace BR, amarelo/azul, confiança" },
  ],
  escola: [
    { name: "Khan Academy", url: "https://www.khanacademy.org", why: "educação online, verde, limpo, acessível" },
    { name: "Coursera", url: "https://www.coursera.org", why: "cursos online, azul, cards de cursos" },
    { name: "Udemy", url: "https://www.udemy.com", why: "marketplace de cursos, roxo, grid" },
  ],
  portfolio: [
    { name: "Dribbble", url: "https://dribbble.com", why: "design community, rosa, grid de projetos" },
    { name: "Behance", url: "https://www.behance.net", why: "portfólio criativo, azul, gallery" },
    { name: "Awwwards", url: "https://www.awwwards.com", why: "os melhores sites do mundo, referência máxima" },
  ],
  startup: [
    { name: "Product Hunt", url: "https://www.producthunt.com", why: "lançamentos, laranja, clean, cards" },
    { name: "Y Combinator", url: "https://www.ycombinator.com", why: "startup accelerator, laranja, minimalista" },
    { name: "TechCrunch", url: "https://techcrunch.com", why: "notícias tech, verde, grid de artigos" },
  ],
};

const GENRE_PATTERNS = [
  { re: /restaurante|comida|pizza|lanchonete|delivery|bufe|confeitaria|padaria|food|churrascaria|sushi|hamburg|caf[eé]/i, key: "restaurante" },
  { re: /advocaci|juridic|advogad|escritorio de|law|direito/i, key: "advocacia" },
  { re: /academia|personal|treino|fitness|musculacao|crossfit|gym|pilates|yoga/i, key: "academia" },
  { re: /imobiliar|imovel|apartamento|casa|corretor|empreendimento|real estate|condom[ií]nio/i, key: "imobiliaria" },
  { re: /moda|roupa|loja de|vestuario|estilista|sapatos|fashion|boutique|camiseta/i, key: "moda" },
  { re: /clinica|saude|medico|dentista|hospital|fisioterapia|psicolog|health|oftalmol|dermatol|veterin/i, key: "saude" },
  { re: /tecnologia|startup|software|aplicativo|ti |sistema|inteligencia artificial|tech|cloud|dev/i, key: "tecnologia" },
  { re: /saas|app |aplicativo|plataforma|radar|marketplace|dashboard|ferramenta|crm|erp/i, key: "saas" },
  { re: /igreja|crist[aã]o|crente|ministerio|culto|evangelic|catolic|paroquia|b[ií]blia|jesus|gospel|adorac|capela|church|templo|louvor/i, key: "igreja" },
  { re: /agencia|criativ|marketing|digital|publicidade|design|agency|comunicacao/i, key: "agencia" },
  { re: /barbearia|barbeiro|barber|salao|cabelereiro|hair/i, key: "barbearia" },
  { re: /pet|animal|veterinar|petshop|gato|cachorro|pet shop/i, key: "pet" },
  { re: /loja virtual|ecommerce|e-commerce|loja online|produtos|venda online|shop/i, key: "ecomerce" },
  { re: /escola|curso|educacao|professor|aluno|ensino|faculdade|universidade|aula|educacional/i, key: "escola" },
  { re: /portf[oó]lio|freelancer|criativo|designer|fot[oó]grafo|artista/i, key: "portfolio" },
  { re: /startup|empresa|neg[oó]cio|inovac|empreend/i, key: "startup" },
];

function detectNiche(prompt: string): string {
  for (const p of GENRE_PATTERNS) {
    if (p.re.test(prompt)) return p.key;
  }
  return "";
}

// Busca DDG lite com query otimizada para encontrar sites de referência
async function searchForSites(query: string): Promise<Array<{url: string; title: string}>> {
  const url = "https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(query);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: Array<{url: string; title: string}> = [];
    // DDG lite: links are in <a rel="nofollow" href="..."> tags
    const linkRe = /<a[^>]*rel="nofollow"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null && results.length < 15) {
      const href = m[1];
      const title = m[2].replace(/<[^>]+>/g, "").trim();
      if (/^https?:\/\//i.test(href) && !/duckduckgo\.com|youtube\.com|facebook\.com|instagram\.com|twitter\.com|pinterest|tiktok|wikipedia|reddit/i.test(href)) {
        results.push({ url: href, title: title || "" });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// Busca sites de referência para o nicho
async function findReferenceSites(niche: string, userPrompt: string): Promise<Array<{url: string; name: string}>> {
  const sites: Array<{url: string; name: string}> = [];
  const seen = new Set<string>();

  // 1. Sites famosos do nicho
  if (niche && NICHE_FAMOUS[niche]) {
    for (const f of NICHE_FAMOUS[niche]) {
      const domain = new URL(f.url).hostname;
      if (!seen.has(domain)) {
        seen.add(domain);
        sites.push({ url: f.url, name: f.name });
      }
    }
  }

  // 2. Busca DDG para sites de design premiados no nicho
  const queries = [
    `best ${niche || ""} website design 2024 2025 award winning`,
    `top ${niche || ""} website inspiration modern professional`,
    userPrompt ? `${userPrompt} website profissional moderno design` : "",
  ].filter(Boolean);

  for (const q of queries) {
    const results = await searchForSites(q);
    for (const r of results.slice(0, 5)) {
      try {
        const domain = new URL(r.url).hostname;
        if (!seen.has(domain) && !/wikipedia|youtube|reddit|pinterest|tiktok|twitter|facebook|instagram/i.test(domain)) {
          seen.add(domain);
          sites.push({ url: r.url, name: r.title || domain });
        }
      } catch {}
    }
    if (sites.length >= 8) break;
  }

  return sites;
}

// Tenta fazer fetch de um site e retorna HTML
async function tryFetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8", "Accept": "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || (!ct.includes("html") && !ct.includes("text"))) return null;
    const html = await res.text();
    if (!html || html.length < 1000) return null;
    return html.slice(0, 200000);
  } catch {
    return null;
  }
}

// Extrai design blueprint limpo e acionável de um HTML
function extractDesignBlueprint(html: string, url: string, siteName: string): string {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim().replace(/<[^>]+>/g, "").slice(0, 120) || "";
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const cssAll = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).join("\n");

  // === CORES ===
  const colorCounts: Record<string, number> = {};
  (body.match(/#[0-9a-fA-F]{3,8}\b/g) || []).forEach((c) => {
    const k = c.toLowerCase().slice(0, 7);
    colorCounts[k] = (colorCounts[k] || 0) + 1;
  });
  const topColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);

  const rgbColors = [...new Set((body.match(/rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\)/gi) || []))].slice(0, 4);

  const gradients = [...new Set((cssAll.match(/(?:background|background-image)\s*:\s*(linear-gradient|radial-gradient)\([^)]+\)/gi) || []))].slice(0, 3).map((g) => g.replace(/(?:background|background-image)\s*:\s*/i, "").trim().slice(0, 80));

  // === FONTES ===
  const fontMatches = (cssAll.match(/font-family\s*:\s*([^;}]{2,60})/gi) || []).concat(body.match(/font-family\s*:\s*([^;}]{2,60})/gi) || []);
  const fonts: string[] = [];
  const skipFonts = new Set(["sans-serif", "serif", "monospace", "cursive", "system-ui", "inherit", "initial"]);
  for (const fx of fontMatches) {
    const name = fx.replace(/font-family\s*:\s*/i, "").split(",")[0].trim().replace(/['"]/g, "").slice(0, 30);
    if (name && !skipFonts.has(name.toLowerCase()) && !fonts.includes(name)) fonts.push(name);
  }

  const fontSizes = [...new Set((cssAll.match(/font-size\s*:\s*\d+(?:\.\d+)?(?:px|rem|em|vw)/gi) || []))].slice(0, 8).map((f) => f.replace(/font-size\s*:\s*/i, ""));

  // === SEÇÕES ===
  const sections: string[] = [];
  if (/<nav\b/i.test(body)) sections.push("navbar");
  if (/<header\b/i.test(body) || /hero/i.test(body)) sections.push("hero");
  if (/banner|jumbotron|hero-section/i.test(body)) sections.push("banner");
  if (/estat[ií]stica|stat|counter|n[uú]mero/i.test(body)) sections.push("stats");
  if (/card|feature|servi[çc]o|product/i.test(body)) sections.push("cards");
  if (/galer|portfolio|projetos|grid.*img/i.test(body)) sections.push("galeria");
  if (/depoiment|testimonial|review|aval/i.test(body)) sections.push("depoimentos");
  if (/pricing|planos|pre[çc]o|mensalidade/i.test(body)) sections.push("planos");
  if (/faq|perguntas|accordion|duvidas/i.test(body)) sections.push("FAQ");
  if (/<form\b/i.test(body)) sections.push("formulário");
  if (/<video|youtube|vimeo/i.test(body)) sections.push("vídeo");
  if (/maps|google.*map|iframe.*map/i.test(body)) sections.push("mapa");
  if (/<footer\b/i.test(body)) sections.push("footer");

  // === CONTEÚDO ===
  const headings = [...body.matchAll(/<(h[1-6])[^>]*>([\s\S]{0,120}?)<\/\1>/gi)]
    .map((m) => `${m[1]}: ${m[2].replace(/<[^>]+>/g, "").trim().slice(0, 80)}`)
    .filter((h) => h.length > 4)
    .slice(0, 12);

  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]{20,300}?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, "").trim().slice(0, 150))
    .filter((p) => p.length > 20)
    .slice(0, 6);

  const ctas: string[] = [];
  for (const m of body.matchAll(/<(?:button|a)[^>]*(?:btn|button|cta|primary)[^>]*>([\s\S]{0,60}?)<\/(?:button|a)>/gi)) {
    const t = m[1].replace(/<[^>]+>/g, "").trim();
    if (t && t.length > 1 && t.length < 40 && !ctas.includes(t)) ctas.push(t);
  }

  const navLinks: string[] = [];
  for (const m of body.matchAll(/<a[^>]*href=["'][^"']+["'][^>]*>([\s\S]{0,40}?)<\/a>/gi)) {
    const t = m[1].replace(/<[^>]+>/g, "").trim();
    if (t && t.length > 1 && t.length < 25 && !navLinks.includes(t)) navLinks.push(t);
  }

  // === ESTILO ===
  const radii = [...new Set((cssAll.match(/border-radius\s*:\s*[\d.]+(?:px|rem|%)/gi) || []))].slice(0, 6).map((r) => r.replace(/border-radius\s*:\s*/i, ""));
  const shadows = [...new Set((cssAll.match(/box-shadow\s*:\s*[^;]{5,60}/gi) || []))].slice(0, 4).map((s) => s.replace(/box-shadow\s*:\s*/i, "").trim().slice(0, 50));
  const animations = [...new Set((cssAll.match(/(?:animation|transition)\s*:\s*[^;]{5,60}/gi) || []))].slice(0, 4).map((a) => a.trim().slice(0, 50));
  const responsive = /@media\s*\(/i.test(cssAll);
  const bgImage = (cssAll.match(/background(?:-image)?\s*:\s*url\([^)]+\)/gi) || []).slice(0, 2);
  const hasParallax = /parallax|background-attachment\s*:\s*fixed/i.test(cssAll);
  const hasGradientBg = /linear-gradient|radial-gradient/i.test(cssAll);

  const imgCount = (body.match(/<img\b/gi) || []).length;

  // Montar blueprint
  let bp = `SITE DE REFERÊNCIA: ${siteName || url}\n`;
  bp += `URL: ${url}\n`;
  if (title) bp += `TÍTULO: "${title}"\n`;
  bp += `\n--- PAleta DE CORES ---\n`;
  bp += `CORES PRINCIPAIS (use exatamente): ${topColors.join(", ")}\n`;
  if (rgbColors.length) bp += `CORES RGBA: ${rgbColors.join(", ")}\n`;
  if (gradients.length) bp += `GRADIENTES: ${gradients.join(" | ")}\n`;

  bp += `\n--- TIPOGRAFIA ---\n`;
  bp += `FONTES: ${fonts.slice(0, 3).join(", ") || "não detectadas — use fontes modernas do nicho"}\n`;
  if (fontSizes.length) bp += `TAMANHOS: ${fontSizes.join(", ")}\n`;

  bp += `\n--- ESTRUTURA (ordem das seções) ---\n`;
  bp += `SEÇÕES: ${sections.join(" → ") || "navbar → hero → conteúdo → footer"}\n`;
  bp += `TOTAL DE SEÇÕES: ${sections.length}\n`;

  bp += `\n--- CONTEÚDO ---\n`;
  if (headings.length) bp += `TÍTULOS:\n${headings.slice(0, 8).map((h) => `  - ${h}`).join("\n")}\n`;
  if (paragraphs.length) bp += `TEXTOS:\n${paragraphs.slice(0, 4).map((p) => `  - "${p}"`).join("\n")}\n`;
  if (ctas.length) bp += `BOTÕES/CTAs: ${ctas.join(", ")}\n`;
  if (navLinks.length) bp += `NAVEGAÇÃO: ${navLinks.slice(0, 8).join(" | ")}\n`;

  bp += `\n--- ESTILO VISUAL ---\n`;
  bp += `BORDAS: ${radii.join(", ") || "não detectadas"}\n`;
  bp += `SOMBRAS: ${shadows.join(" | ") || "nenhuma"}\n`;
  bp += `ANIMAÇÕES: ${animations.join(" | ") || "nenhuma"}\n`;
  bp += `FUNDO COM GRADIENTE: ${hasGradientBg ? "SIM" : "NÃO"}\n`;
  bp += `PARALLAX: ${hasParallax ? "SIM" : "NÃO"}\n`;
  bp += `IMAGENS: ${imgCount} imagens na página\n`;
  bp += `RESPONSIVO: ${responsive ? "SIM" : "NÃO"}\n`;

  bp += `\n--- INSTRUÇÃO OBRIGATÓRIA ---\n`;
  bp += `Ao gerar o site, REPRODUZA EXATAMENTE esta paleta de cores, fontes, estrutura de seções, textos dos botões, títulos e textos. O site deve ser visualmente IDÊNTICO ao modelo de referência em termos de design. Não invente um layout genérico — copie fielmente o modelo.`;

  return bp;
}

// Score de qualidade do HTML
function scoreHtml(html: string): number {
  if (!html || html.length < 2000) return 0;
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  let s = 0;
  s += Math.min(15, (body.match(/<h[1-3]\b/gi) || []).length * 2);
  s += Math.min(10, (body.match(/<img\b/gi) || []).length);
  s += ((body.match(/<nav\b|<header\b/i) || []).length) * 4;
  s += ((body.match(/<footer\b/i) || []).length) * 3;
  s += (body.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length > 10 ? 5 : 0;
  s += (/@media\s*\(/i.test(html) ? 4 : 0);
  s += ((body.match(/<form\b/i) || []).length) * 3;
  s += ((body.match(/<section\b/i) || []).length) * 2;
  s += ((body.match(/animation|transition/gi) || []).length > 3 ? 3 : 0);
  s += ((body.match(/box-shadow/gi) || []).length > 2 ? 3 : 0);
  s += ((body.match(/linear-gradient|radial-gradient/gi) || []).length > 1 ? 3 : 0);
  s += ((body.match(/<button\b/gi) || []).length > 2 ? 2 : 0);
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").slice(0, 500);
    const niche = detectNiche(prompt);

    // 1. Encontrar sites de referência
    const candidates = await findReferenceSites(niche, prompt);

    // 2. Fetch dos top candidates e extrair blueprints
    const results = await Promise.allSettled(
      candidates.slice(0, 8).map(async (c) => {
        const html = await tryFetchHtml(c.url);
        if (!html) return null;
        const score = scoreHtml(html);
        if (score < 8) return null;
        const blueprint = extractDesignBlueprint(html, c.url, c.name);
        return { blueprint, url: c.url, name: c.name, score };
      })
    );

    const valid = results
      .filter((r): r is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof tryFetchHtml>> extends null ? never : {blueprint: string; url: string; name: string; score: number}>> => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value!)
      .sort((a, b) => b.score - a.score);

    let finalBrief = "";
    let source = "preset";

    if (valid.length > 0) {
      const best = valid[0];
      finalBrief = best.blueprint;
      source = "web";
      // Adicionar segunda referência se disponível
      if (valid.length > 1) {
        const second = valid[1];
        finalBrief += `\n\n--- SEGUNDA REFERÊNCIA: ${second.name} (${second.url}) ---\n`;
        // Extrair apenas cores e estrutura da segunda referência
        const body2 = second.blueprint;
        const colorsMatch = body2.match(/CORES PRINCIPAIS[^:]*:\s*(.+)/);
        const sectionsMatch = body2.match(/SEÇÕES:\s*(.+)/);
        if (colorsMatch) finalBrief += `CORES ALTERNATIVAS: ${colorsMatch[1]}\n`;
        if (sectionsMatch) finalBrief += `ESTRUTURA ALTERNATIVA: ${sectionsMatch[1]}\n`;
      }
    } else if (niche && NICHE_FAMOUS[niche]) {
      // Fallback: usar apenas a lista famosa sem fetch
      const famous = NICHE_FAMOUS[niche][0];
      finalBrief = `Use como referência o site ${famous.name} (${famous.url}), mundialmente reconhecido por: ${famous.why}. Reproduza o estilo visual, paleta de cores e estrutura de seções desse site.`;
      source = "preset";
    }

    return new Response(JSON.stringify({
      niche,
      source,
      referencesFound: valid.length,
      bestSite: valid[0]?.name || "",
      bestScore: valid[0]?.score || 0,
      brief: finalBrief,
    }), {
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
