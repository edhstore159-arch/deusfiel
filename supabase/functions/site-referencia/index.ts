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
    { name: "Apple", url: "https://www.apple.com" },
    { name: "Stripe", url: "https://stripe.com" },
    { name: "Linear", url: "https://linear.app" },
    { name: "Figma", url: "https://www.figma.com" },
  ],
  igreja: [
    { name: "Igreja de Jesus Cristo dos Santos dos Últimos Dias", url: "https://www.churchofjesuschrist.org" },
    { name: "Hillsong", url: "https://hillsong.com" },
    { name: "Bíblia Online", url: "https://www.bibliaonline.com.br" },
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
  { re: /igreja|ministerio|culto|evangelic|catolic|paroquia/i, key: "igreja" },
  { re: /agencia|marketing|digital|publicidade|design/i, key: "agencia" },
];

function detectGenre(prompt) {
  for (const p of GENRE_PATTERNS) {
    if (p.re.test(prompt)) return p.key;
  }
  return "";
}

function extractBrief(html, url) {
  if (!html || html.length < 200) return "";
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim().slice(0, 90) || "";
  const desc = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i) || [])[1]?.trim().slice(0, 180) || "";
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const hexRaw = body.match(/#[0-9a-fA-F]{6}\b/g) || [];
  const hexes = [...new Set(hexRaw)].slice(0, 6);
  const fontRaw = body.match(/font-family\s*:\s*([^;}]{2,40})/gi) || [];
  const fontList = [];
  for (const fx of fontRaw) {
    const name = fx.replace(/font-family\s*:\s*/i, "").split(",")[0].trim().replace(/['"]/g, "").slice(0, 30);
    if (name && !fontList.includes(name)) fontList.push(name);
  }
  const fonts = fontList.slice(0, 4);
  const hCount = (body.match(/<h1\b/gi) || []).length + (body.match(/<h2\b/gi) || []).length;
  const hasNav = /<nav\b|<header\b/i.test(body);
  const hasFooter = /<footer\b/i.test(body);
  const hasHero = /hero|banner|hero-section/i.test(body);
  const hasCards = /grid|card/i.test(body);
  const imgCount = (body.match(/<img\b/gi) || []).length;
  return `Modelo real pesquisado na internet: ${url}${title ? ` — "${title}"` : ""}${desc ? ` (${desc})` : ""}${hexes.length ? ` | Cores usadas: ${hexes.join(", ")}` : ""}${fonts.length ? ` | Fontes: ${fonts.join(", ")}` : ""} | Estrutura: ${hasNav ? "navbar, " : ""}${hasHero ? "hero, " : ""}${hasCards ? "cards, " : ""}${hasFooter ? "footer" : ""} | ${hCount} títulos, ${imgCount} imagens. Use esse modelo como referência de layout e combine com as regras de design moderno.`;
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

    let brief = "";
    let searchedUrl = "";
    let source = "";

    if (genre && FAMOUS_SITES[genre]) {
      for (const famous of FAMOUS_SITES[genre]) {
        const html = await tryFetch(famous.url);
        if (html) {
          const b = extractBrief(html, famous.url);
          brief = `Use como referência conceitual o site ${famous.name} (${famous.url}), reconhecido mundialmente${b.length > 60 ? ` — ${b}` : ""}.`;
          searchedUrl = famous.url;
          source = "famoso";
          break;
        }
      }
    }

    if (!brief) {
      const query = `${genre ? GENRE_PRESETS[genre].slice(0, 60).replace("Referência: ", "") : prompt} melhor site ${genre ? "" : "modelo "}design award premiado`;
      const links = await searchLite(query);
      for (const link of links.slice(0, 4)) {
        const html = await tryFetch(link);
        if (html) {
          const b = extractBrief(html, link);
          if (b.length > 60) { brief = "Referência pesquisada na internet: " + b; searchedUrl = link; source = "busca"; break; }
        }
      }
    }

    if (!brief && preset) {
      brief = preset + (genre ? ` | Gênero detectado: ${genre}.` : "");
      source = "preset";
    } else if (source === "famoso" && preset) {
      brief += "\n\nDireção de design para este segmento:\n" + preset.replace("Referência: ", "");
      source = "famoso";
    }

    return new Response(JSON.stringify({ genre, searchedUrl, source, brief }), {
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