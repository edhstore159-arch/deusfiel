const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const GENRE_PRESETS = {
  esportes: "Referência: site moderno de esportes — hero escuro com gradiente, cards de modalidades (futebol, basquete, academia), placares/tabelas em destaque, seção de atletas com fotos, cores vibrantes (verde/lima, laranja) sobre fundo escuro, tipografia bold condensada, navbar fixa com logo esportivo.",
  advocacia: "Referência: site premium de escritório de advocacia — paleta sóbria (azul-marinho, dourado), tipografia serifada elegante, hero institucional com foto do escritório, seções de áreas de atuação em cards, depoimentos, formulário de contato destacado, rodapé completo com endereço.",
  restaurante: "Referência: site apetitoso de restaurante — fundo escuro com fotos de pratos grandes, tipografia display arredondada, menu em cards com preços, reservas com CTA em gradiente, seção de avaliações com estrelas, paleta quente (vermelho/laranja/âmbar).",
  imobiliaria: "Referência: site clean de imobiliária — paleta neutra com destaque verde/esmeralda, grid de imóveis com fotos e preços em cards, filtros de busca no hero, seções de localização e depoimentos, tipografia geométrica moderna.",
  academia: "Referência: site energético de academia/fitness — fundo escuro com fotos de treinos em alta energia, destaques em vermelho/amarelo neon, planos de mensalidade em cards, contador de membros, seção de treinadores com fotos.",
  moda: "Referência: site elegante de moda — paleta minimalista (branco, bege, preto), tipografia fina com muito espaçamento, imagens de produtos em grande escala, layout editorial com grid assimétrico, hover com zoom suave nas fotos.",
  saude: "Referência: site confiável de saúde/clínica — paleta verde-água e branco, cards suaves arredondados, fotos de equipe médica, seções de especialidades com ícones, depoimentos de pacientes, agendamento com CTA.",
  tecnologia: "Referência: site futurista de tecnologia/startup — fundo escuro com gradientes neon (azul/roxo), glassmorphism em cards, animações de fade-in, seção de recursos com ícones, métricas em destaque, CTA em gradiente brilhante.",
  saas: "Referência (lógica Ozyxtraker): SaaS/app premium dark — design system em variáveis CSS (--background escuro, --foreground claro, --primary vibrante, --surface-2, --card, --border, --muted-foreground), fundo com radial-gradient do primary no topo + gradiente linear, fonte display (Outfit) para títulos e sans (IBM Plex Sans) para texto, cards rounded-2xl com borda e sombra suave, botões min-h-12 rounded-xl/2xl font-semibold com active:scale-[0.98] e sombra flutuante, inputs rounded-2xl com ícone à esquerda e foco com ring, labels 12px uppercase com letter-spacing, divisor com 'ou', botão social com border-2, badge de segurança (Conexão Segura · Criptografia), logo no topo e marca opaca no rodapé, animação fade-in-up ao carregar, coluna max-w-md centrada com safe-area, micro-interações sutis e foco visível.",
  igreja: "Referência: site acolhedor de igreja — paleta dourada e tons de madeira/branco, tipografia serifada com toque clássico, seção de cultos com horários, galeria de fotos, versículo em destaque no hero, formulário de contato.",
  agencia: "Referência: site criativo de agência digital — fundo claro com elementos em gradiente colorido, tipografia bold grande, portfólio em grid com hover animado, marcas em carrossel, seção de serviços em cards com ícones.",
};

const FAMOUS_SITES = {
  esportes: [
    { name: "ESPN", url: "https://www.espn.com" },
    { name: "Nike", url: "https://www.nike.com" },
    { name: "Globo Esporte", url: "https://ge.globo.com" },
    { name: "Adidas", url: "https://www.adidas.com" },
  ],
  advocacia: [
    { name: "Pinheiro Neto Advogados", url: "https://www.pinheironeto.com.br" },
    { name: "TozziniFreire", url: "https://www.tozzinifreire.com.br" },
    { name: "Skadden", url: "https://www.skadden.com" },
    { name: "White & Case", url: "https://www.whitecase.com" },
  ],
  restaurante: [
    { name: "Fogo de Chão", url: "https://fogodechao.com.br" },
    { name: "Outback Steakhouse", url: "https://www.outback.com" },
    { name: "Nando's", url: "https://www.nandos.co.uk" },
    { name: "Madero", url: "https://www.madero.com.br" },
  ],
  imobiliaria: [
    { name: "Zillow", url: "https://www.zillow.com" },
    { name: "CBRE", url: "https://www.cbre.com" },
    { name: "JLL", url: "https://www.us.jll.com" },
    { name: "Lopes Imóveis", url: "https://www.lopes.com.br" },
  ],
  academia: [
    { name: "Equinox", url: "https://www.equinox.com" },
    { name: "Gold's Gym", url: "https://www.goldsgym.com" },
    { name: "CrossFit", url: "https://www.crossfit.com" },
    { name: "Smart Fit", url: "https://www.smartfit.com.br" },
  ],
  moda: [
    { name: "Louis Vuitton", url: "https://www.louisvuitton.com" },
    { name: "Gucci", url: "https://www.gucci.com" },
    { name: "Farfetch", url: "https://www.farfetch.com" },
    { name: "Renner", url: "https://www.lojasrenner.com.br" },
  ],
  saude: [
    { name: "Mayo Clinic", url: "https://www.mayoclinic.org" },
    { name: "Cleveland Clinic", url: "https://my.clevelandclinic.org" },
    { name: "Hospital Albert Einstein", url: "https://www.einstein.br" },
    { name: "Hospital Sírio-Libanês", url: "https://www.hospitalsiriolibanes.org.br" },
  ],
  tecnologia: [
    { name: "Ozyxtraker", url: "https://ozyxapp.com.br" },
    { name: "Stripe", url: "https://stripe.com" },
    { name: "Linear", url: "https://linear.app" },
    { name: "Vercel", url: "https://vercel.com" },
  ],
  saas: [
    { name: "Ozyxtraker", url: "https://ozyxapp.com.br" },
    { name: "Stripe", url: "https://stripe.com" },
    { name: "Linear", url: "https://linear.app" },
    { name: "Notion", url: "https://www.notion.so" },
  ],
  igreja: [
    { name: "Elevation Church", url: "https://elevationchurch.org" },
    { name: "Hillsong", url: "https://hillsong.com" },
    { name: "Gateway Church", url: "https://gatewaypeople.com" },
    { name: "Bíblia Sagrada Online", url: "https://www.bibliaonline.com.br" },
    { name: "Igreja de Jesus Cristo dos Santos dos Últimos Dias", url: "https://www.churchofjesuschrist.org" },
  ],
  agencia: [
    { name: "Awwwards", url: "https://www.awwwards.com" },
    { name: "R/GA", url: "https://www.rga.com" },
    { name: "Futura", url: "https://www.futura.com.br" },
    { name: "TBWA", url: "https://www.tbwa.com" },
  ],
};

const GENRE_PATTERNS = [
  { re: /esport|futebol|fitness|academia|basquete|clube/i, key: "esportes" },
  { re: /advocaci|juridic|advogad|escritorio de/i, key: "advocacia" },
  { re: /restaurant|comida|pizza|lanchonete|delivery|bufe|confeitaria|padaria/i, key: "restaurante" },
  { re: /imobiliar|imovel|apartamento|casa|corretor|empreendimento/i, key: "imobiliaria" },
  { re: /academia|personal|treino|fitness|musculacao|crossfit/i, key: "academia" },
  { re: /moda|roupa|loja de|vestuario|estilista|sapatos/i, key: "moda" },
  { re: /clinica|saude|medico|dentista|hospital|fisioterapia|psicolog/i, key: "saude" },
  { re: /tecnologia|startup|software|aplicativo|ti |sistema|inteligencia artificial|tech/i, key: "tecnologia" },
  { re: /saas|app |aplicativo|plataforma|radar|marketplace|dashboard|ferramenta/i, key: "saas" },
  { re: /igreja|crist[aã]o|crente|ministerio|culto|evangelic|catolic|paroquia|b[ií]blia|jesus|gospel|adorac|capela/i, key: "igreja" },
  { re: /agencia|criativ|marketing|digital|publicidade|design/i, key: "agencia" },
];

function detectGenre(prompt) {
  for (const p of GENRE_PATTERNS) {
    if (p.re.test(prompt)) return p.key;
  }
  return "";
}

function extractBlueprint(html, url) {
  if (!html || html.length < 200) return "";
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim().slice(0, 90) || "";
  const desc = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i) || [])[1]?.trim().slice(0, 180) || "";
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const cssRaw = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).join(" ");

  const colorCounts = {};
  (body.match(/#[0-9a-fA-F]{6}\b/g) || []).forEach((c) => {
    const k = c.toLowerCase();
    colorCounts[k] = (colorCounts[k] || 0) + 1;
  });
  const colors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);

  const fontRaw = (body.match(/font-family\s*:\s*([^;}]{2,40})/gi) || []).concat(cssRaw.match(/font-family\s*:\s*([^;}]{2,40})/gi) || []);
  const fontList = [];
  for (const fx of fontRaw) {
    const name = fx.replace(/font-family\s*:\s*/i, "").split(",")[0].trim().replace(/['"]/g, "").slice(0, 30);
    if (name && name !== "sans-serif" && name !== "serif" && !fontList.includes(name)) fontList.push(name);
  }
  const fonts = fontList.slice(0, 4);

  const headings = [...body.matchAll(/<(h[1-3])[^>]*>([\s\S]{0,90}?)<\/\1>/gi)]
    .map((m) => `${m[1]}: ${m[2].replace(/<[^>]+>/g, "").trim().slice(0, 60)}`)
    .filter(Boolean)
    .slice(0, 14);

  const hasNav = /<nav\b|<header\b/i.test(body);
  const hasHero = /hero|banner|hero-section/i.test(body);
  const hasCards = /card|feature|servi[çc]o|product|grid/i.test(body);
  const hasStats = /stat|n[uú]mero|metric|counter/i.test(body);
  const hasTestimonials = /testimonial|depoiment|review|aval/i.test(body);
  const hasPricing = /pricing|planos|pre[çc]o|mensalidade|assinatura/i.test(body);
  const hasFaq = /faq|perguntas|accordion|duvidas/i.test(body);
  const hasForm = /<form\b/i.test(body);
  const hasGallery = /galer|gallery|portfolio|projetos/i.test(body);
  const hasFooter = /<footer\b/i.test(body);

  const ctas = [];
  for (const m of body.matchAll(/<button[^>]*>([\s\S]{0,60}?)<\/button>/gi)) {
    const t = m[1].replace(/<[^>]+>/g, "").trim();
    if (t && t.length < 40 && !ctas.includes(t)) ctas.push(t);
  }
  for (const m of body.matchAll(/<a[^>]*(?:btn|button|cta)[^>]*>([\s\S]{0,60}?)<\/a>/gi)) {
    const t = m[1].replace(/<[^>]+>/g, "").trim();
    if (t && t.length < 40 && !ctas.includes(t)) ctas.push(t);
  }

  const radii = [...new Set((cssRaw.match(/border-radius\s*:\s*(\d+(?:\.\d+)?px)/gi) || []).slice(0, 12))].map((r) => r.replace(/border-radius\s*:\s*/i, ""));
  const paddings = [...new Set((cssRaw.match(/padding\s*:\s*(\d+(?:\.\d+)?px)/gi) || []).slice(0, 10))].map((p) => p.replace(/padding\s*:\s*/i, ""));
  const responsive = /@media\s*\(/i.test(cssRaw);

  const imgs = [...body.matchAll(/<img[^>]*alt=["']([^"']{2,50})["']/gi)].map((m) => m[1]).filter(Boolean).slice(0, 10);
  const imgCount = (body.match(/<img\b/gi) || []).length;

  const sections = [];
  if (hasNav) sections.push("navbar/header");
  if (hasHero) sections.push("hero");
  if (hasStats) sections.push("estatísticas");
  if (hasCards) sections.push("cards/features");
  if (hasGallery) sections.push("galeria/portfólio");
  if (hasTestimonials) sections.push("depoimentos");
  if (hasPricing) sections.push("planos/preços");
  if (hasFaq) sections.push("FAQ");
  if (hasForm) sections.push("formulário");
  if (hasFooter) sections.push("footer");

  return `Modelo conceituado: ${url}${title ? ` — "${title}"` : ""}${desc ? ` (${desc})` : ""} | Paleta de cores (por frequência): ${colors.join(", ") || "não detectada"} | Fontes: ${fonts.join(", ") || "não detectadas"} | Seções em ordem estratégica: ${sections.join(" → ") || "não detectadas"} | Estrutura: ${hasNav ? "navbar, " : ""}${hasHero ? "hero, " : ""}${hasCards ? "cards, " : ""}${hasStats ? "stats, " : ""}${hasTestimonials ? "depoimentos, " : ""}${hasPricing ? "preços, " : ""}${hasForm ? "formulário, " : ""}${hasFooter ? "footer" : ""} | Botões/CTAs: ${ctas.join(", ") || "não detectados"} | Cantos arredondados: ${radii.slice(0, 4).join(", ") || "não detectados"} | Espaçamentos: ${paddings.slice(0, 4).join(", ") || "não detectados"} | Responsivo: ${responsive ? "sim (media queries)" : "não detectado"} | ${headings.length} títulos, ${imgCount} imagens${imgs.length ? ` (temas: ${imgs.slice(0, 6).join(" | ")})` : ""}.

FIDELIDADE: ao gerar o site, reproduza fielmente esta paleta de cores (na mesma proporção), as fontes, a ordem e a estrutura de seções, os textos dos botões/CTAs, o estilo de cantos e espaçamentos, e use imagens dos mesmos temas.`;
}

function scoreHtml(html) {
  if (!html || html.length < 1000) return 0;
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  let s = 0;
  s += Math.min(10, (body.match(/<h[1-3]\b/gi) || []).length);
  s += Math.min(8, (body.match(/<img\b/gi) || []).length);
  s += ((body.match(/<nav\b|<header\b/i) || []).length) * 2;
  s += ((body.match(/<footer\b/i) || []).length) * 2;
  s += ((body.match(/#[0-9a-fA-F]{6}\b/g) || []).length > 4 ? 3 : 0);
  s += (/@media\s*\(/i.test(html) ? 2 : 0);
  s += ((body.match(/<form\b/i) || []).length) * 2;
  s += ((body.match(/<section\b/i) || []).length);
  return s;
}

async function searchLite(q) {
  const url = "https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(q);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  const links = [];
  const re = /<a[^>]*rel="nofollow"[^>]*href="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null && links.length < 8) {
    const href = m[1];
    if (/^https?:\/\//i.test(href) && !/duckduckgo\.com|youtube\.com|facebook\.com|instagram\.com|twitter\.com|t\.me/i.test(href)) {
      links.push(href);
    }
  }
  return links;
}

async function tryFetch(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9", "Accept": "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("html")) return null;
    const html = await res.text();
    if (!html || html.length < 1000) return null;
    return html.slice(0, 120000);
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

    let best = { brief: "", url: "", score: -1, name: "" };
    let source = "";

    if (genre && FAMOUS_SITES[genre]) {
      for (const famous of FAMOUS_SITES[genre]) {
        const html = await tryFetch(famous.url);
        if (!html) continue;
        const score = scoreHtml(html);
        const b = extractBlueprint(html, famous.url);
        if (b.length > 60 && score > best.score) {
          best = { brief: b, url: famous.url, score, name: famous.name };
          source = "famoso";
        }
      }
    }

    if (!best.brief) {
      const queries = [
        `${genre ? GENRE_PRESETS[genre].slice(0, 60).replace("Referência: ", "") : prompt} melhor site ${genre ? "" : "modelo "}design award premiado`,
        `${genre ? GENRE_PRESETS[genre].slice(0, 60).replace("Referência: ", "") : prompt} website design inspiração top`,
      ];
      for (const query of queries) {
        const links = await searchLite(query);
        for (const link of links.slice(0, 4)) {
          const html = await tryFetch(link);
          if (!html) continue;
          const score = scoreHtml(html);
          const b = extractBlueprint(html, link);
          if (b.length > 60 && score > best.score) {
            best = { brief: b, url: link, score, name: "" };
            source = "busca";
          }
        }
        if (best.brief) break;
      }
    }

    let brief = "";
    if (best.brief) {
      brief = best.name
        ? `Use como referência conceitual o site ${best.name} (${best.url}), reconhecido mundialmente — ${best.brief}`
        : `Referência pesquisada na internet: ${best.brief}`;
      if (genre && preset) brief += "\n\nDireção de design para este segmento:\n" + preset.replace("Referência: ", "");
    } else if (preset) {
      brief = preset + (genre ? ` | Gênero detectado: ${genre}.` : "");
      source = "preset";
    }

    return new Response(JSON.stringify({ genre, searchedUrl: best.url, source, score: best.score, brief }), {
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