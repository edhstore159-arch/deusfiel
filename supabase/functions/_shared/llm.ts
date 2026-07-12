// Shared LLM helpers with fallback chain: Ollama (when configured) → Lovable → Google Gemini (direct) → Emergent.

type ChatMessage = { role: string; content: any };

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  response_format?: any;
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
  preferFastProvider?: boolean;
  preferProvider?: "auto" | "emergent" | "lovable" | "gemini" | "ollama";
}

export interface ImageOptions {
  prompt: string;
  size?: string;
  quality?: string;
  preferProvider?: "auto" | "pollinations" | "emergent" | "lovable" | "gemini";
}

const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const EMERGENT_KEY = Deno.env.get("EMERGENT_API_KEY");
const OLLAMA_URL = Deno.env.get("OLLAMA_URL")?.trim().replace(/\/+$/, "").replace(/\/api\/(generate|chat|tags)$/, "");
const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") || "qwen3:8b";
const OLLAMA_API_KEY = Deno.env.get("OLLAMA_API_KEY");

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(3000, timeoutMs));
  try {
    return await fetch(url, { ...init, signal: init.signal || controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const FACE_SAFE_PROMPT =
  "Human face integrity lock (priority #1): render every visible face as a natural real human face, not AI-looking. Use a DSLR portrait/documentary look (Canon EOS R5 / Sony A7R IV, 85mm or 50mm prime lens, RAW photo, natural light), with the main face large enough in the frame to preserve detail. Facial geometry must be coherent: exactly two eyes placed on the same horizontal line, similar size and shape, centered pupils looking in the same direction, one centered nose, one natural mouth, one jaw, one forehead, two ears only when visible, no duplicated or floating facial parts. Skin must be photorealistic with pores, peach fuzz, subtle asymmetry, faint freckles/moles/fine lines where natural, real shadows and subsurface scattering; never waxy, plastic, smoothed or doll-like. Eyes must be alive and expressive with detailed irises, natural sclera, eyelids, eyelashes and catchlights; avoid blank/dead/glassy eyes. Teeth, if visible, must be natural and limited to a normal mouth opening — never extra rows, glowing teeth or oversized teeth. For groups, keep faces reasonably sized and apply this check to each person; if the scene does not require a crowd, prefer one to three people instead of many tiny faces. Final face QA before output: aligned eyes, centered pupils, normal nose, normal mouth, normal teeth, normal jaw, no melting, no warping, no double pupils, no extra eyes, no fused eyes, no duplicate face, no face merged with hair/clothes/objects. Negative face: deformed face, distorted face, melted face, warped face, mutated face, disfigured face, lopsided face, mismatched eyes, different sized eyes, misaligned eyes, cross-eyed, lazy eye, dead eyes, glassy eyes, blank stare, extra eyes, missing eye, fused eyes, third eye, double pupils, wrong pupils, double nose, missing nose, double mouth, extra mouth, bad teeth, too many teeth, missing teeth, duplicated face, two faces on one head, floating facial features, facial features merged with object, plastic skin, waxy skin, airbrushed, porcelain skin, beauty filter, CGI, 3D render, cartoon, anime, illustration, painting, AI-generated look, low-res face, blurry face, oversharpened face.";

const FACE_NEGATIVE_PROMPT =
  "deformed face, distorted face, melted face, warped face, mutated face, disfigured face, lopsided face, asymmetrical eyes caused by error, mismatched eyes, different sized eyes, misaligned eyes, cross-eyed, lazy eye, dead eyes, glassy eyes, blank stare, extra eyes, missing eye, fused eyes, third eye, double pupils, wrong pupils, double nose, missing nose, double mouth, extra mouth, bad teeth, too many teeth, missing teeth, duplicated face, two faces on one head, floating facial features, face merged with hair, face merged with clothes, face merged with objects, low detail face, blurry face, plastic skin, waxy skin, doll face, mannequin face, uncanny valley";


const HAND_SAFE_PROMPT =
  "Hand safety lock: unless hands are the main subject, compose as a chest-up or waist-up photograph with hands completely outside the frame or naturally hidden behind clothing, a desk, pockets, folders, books, or other objects. No visible fingers when hands are not requested. If any hand is visible, it must pass a strict anatomy check: exactly five fingers per hand (one thumb + four fingers), no extra digits, no missing digits, no fused digits, correct thumb opposition and placement, natural palm structure, correct knuckle count, realistic fingernails, natural finger spacing, proportional finger lengths, and a normal wrist connection.";

const HAND_NEGATIVE_PROMPT =
  "bad hands, malformed hands, deformed hands, mutated hands, distorted hands, broken hands, ugly hands, extra fingers, six fingers, seven fingers, four fingers, three fingers, missing fingers, fused fingers, webbed fingers, duplicated fingers, duplicate fingertips, duplicate thumbs, two thumbs, missing thumb, extra nails, missing nails, wrong thumb placement, wrong knuckle count, impossible joints, bent-backwards fingers, claw hands, rubber fingers, sausage fingers, baguette fingers, long unnatural fingers, tiny hands, oversized hands, detached hands, floating hands, hands growing from wrong place, twisted wrists, broken wrists";

const HANDS_ARE_REQUESTED = /\b(hand|hands|finger|fingers|thumb|gesture|handshake|waving|pointing|holding|grabbing|clapping|typing|writing|eating|feeding|cutting|serving|holding\s+(a\s+)?(fork|spoon|knife|plate|cake)|m[aã]o|m[aã]os|dedo|dedos|polegar|gesto|aperto de m[aã]o|acenando|apontando|segurando|digitando|escrevendo|comendo|alimentando|cortando|servindo|segurando\s+(um\s+|uma\s+)?(garfo|colher|faca|prato|bolo))\b/i;
const EATING_CAKE_RE = /\b(eating|feeding|taking\s+a\s+bite|bite|biting|comendo|alimentando|mordendo|dar\s+uma\s+mordida|cortando|servindo)\b[\s\S]{0,80}\b(cake|birthday\s+cake|bolo|bolo\s+de\s+anivers[áa]rio|slice\s+of\s+cake|fatia\s+de\s+bolo)\b|\b(cake|birthday\s+cake|bolo|bolo\s+de\s+anivers[áa]rio|slice\s+of\s+cake|fatia\s+de\s+bolo)\b[\s\S]{0,80}\b(eating|feeding|taking\s+a\s+bite|bite|biting|comendo|alimentando|mordendo|dar\s+uma\s+mordida|cortando|servindo)\b/i;
const SCENERY_RE = /\b(p[oô]r\s*[- ]?do\s+sol|por\s+do\s+sol|sunset|sunrise|nascer\s+do\s+sol|entardecer|crep[úu]sculo|golden\s+hour|paisagem|landscape|natureza|nature|c[ée]u|sky|nuvens?|clouds?|oceano|ocean|mar\b|sea\b|praia|beach|montanha|mountain|floresta|forest|cachoeira|waterfall|rio\b|river\b|lago\b|lake\b|deserto|desert)\b/i;

export function isScenerySubject(prompt = "") {
  return SCENERY_RE.test(prompt);
}

export function hasHybridRequest(prompt = "") {
  return /\bcom\s+(cara|rosto|face|olhos|boca|sorriso|express[ãa]o)\s+humana?s?\b/i.test(prompt)
    || /\b(with|having)\s+(a\s+)?human\s+(face|eyes|mouth|smile|expression)\b/i.test(prompt)
    || /\b(antropomorf|anthropomorph|surreal hybrid|h[íi]brido surreal|fruta humanizada|humanized fruit)\b/i.test(prompt);
}

const EVENT_RE_HUMAN = /\b(anivers[áa]rio|birthday|festa|party|casamento|wedding|noivado|engagement|formatura|graduation|batizado|baptism|ch[áa]\s+de\s+beb[êe]|baby\s+shower|comemora[çc][ãa]o|celebration|natal|christmas|ano\s+novo|new\s+year|carnaval|carnival|reveillon|p[áa]scoa|easter|halloween|dia\s+das\s+m[ãa]es|dia\s+dos\s+pais|confraterniza[çc][ãa]o)\b/i;

export function hasHumanSubject(prompt = "") {
  if (hasHybridRequest(prompt)) return true;
  if (isScenerySubject(prompt)) return false;
  if (/\b(non-human subject lock|non-human object lock|object isolation lock|standalone non-human subject|photorealistic non-human subject)\b/i.test(prompt)) return false;
  if (/\bsubject\s+lock\b[\s\S]{0,160}\b(subject\s+is\s+(the\s+)?(object|fruit|landmark|architectural structure)|render\s+only\s+that\s+subject)\b/i.test(prompt)) return false;
  if (/--no\s+(human|face|hands|body_parts)|\bno\s+anatomy\b|\bno\s+portrait\b/i.test(prompt)) return false;
  if (EVENT_RE_HUMAN.test(prompt)) return true;
  return /\b(person|people|human|man|woman|child|face|portrait|lawyer|client|brazilian|homem|mulher|pessoa|pessoas|rosto|retrato|advogado|advogada|cliente|crian[cç]a|idos[ao]|jovem|senhor|senhora|m[ãa]e|pai|filh[ao]|viol[êe]ncia|agress[ãa]o|hematoma|ematoma|les[ãa]o|les[õo]es|ferid[ao]|machucad[ao]|corpo|bra[cç]o|perna|pele humana|bruise|injury|wound|assault)\b/i.test(prompt);
}

// Corrige erros comuns de digitação em PT-BR e traduz frutas/objetos para inglês
// para melhorar a fidelidade da geração de imagens (ex.: "macan" → "maçã apple fruit").
const PROMPT_TYPO_MAP: Array<[RegExp, string]> = [
  // ===== PAISAGENS / FENÔMENOS NATURAIS =====
  [/\b(p[oô]r\s*[- ]?do\s+sol|por\s+do\s+sol)\s+(inluminad[ao]s?|iluminad[ao]s?)\b/gi, "pôr do sol iluminado (real natural sunset landscape: glowing sun near the horizon, warm orange red and golden sky, illuminated clouds, atmospheric light rays, realistic landscape, NO human face, NO person, NO eyes, NO portrait)"],
  [/\b(p[oô]r\s*[- ]?do\s+sol|por\s+do\s+sol)\b/gi, "pôr do sol (real natural sunset landscape: sun near the horizon, warm orange red and golden sky, clouds lit by sunlight, realistic landscape, NO human face, NO person, NO portrait)"],
  [/\binluminad([ao]s?)\b/gi, "iluminad$1"],

  // ===== SÍMBOLOS / ÍCONES =====
  [/\bcora[cç][ãa]o\b/gi, "coração (red love heart symbol, classic stylized heart shape, romantic icon, NOT a fruit, NOT an anatomical organ unless requested)"],
  [/\bcoracoes\b|\bcora[cç][õo]es\b/gi, "corações (red love heart symbols, classic stylized heart shapes)"],
  [/\bestrela?s?\b/gi, "estrela (five-pointed star symbol)"],
  [/\blua\b/gi, "lua (moon, crescent moon)"],
  [/\bsol\b/gi, "sol (sun, bright sunshine)"],

  // ===== FRUTAS =====
  [/\bmac[ãa]+n?s?\b/gi, "maçã (apple fruit, red apple, fresh fruit)"],
  [/\bmaca\b/gi, "maçã (apple fruit, red apple, fresh fruit)"],
  [/\bbanan[ao]s?\b/gi, "banana (ripe yellow banana fruit)"],
  [/\blaranj[ao]s?\b/gi, "laranja (orange fruit, citrus)"],
  [/\buv[ao]s?\b/gi, "uva (grapes, bunch of purple grapes)"],
  [/\bmorang[ao]s?\b/gi, "morango (strawberry fruit)"],
  [/\babacax[ií]s?\b/gi, "abacaxi (pineapple fruit)"],
  [/\bmel[ãa]+n?cias?\b/gi, "melancia (watermelon fruit)"],
  [/\bmam[ãa]+n?o?s?\b/gi, "mamão (papaya fruit)"],
  [/\bp[êe]ras?\b/gi, "pera (pear fruit)"],
  [/\bmang[ao]s?\b/gi, "manga (mango fruit, tropical)"],
  [/\bgoiab[ao]s?\b/gi, "goiaba (guava fruit)"],
  [/\bma?racuj[áa]s?\b/gi, "maracujá (passion fruit)"],
  [/\bcocos?\b/gi, "coco (coconut fruit)"],
  [/\bkiwis?\b/gi, "kiwi (kiwi fruit)"],
  [/\blim[ãa]+n?o?s?\b/gi, "limão (lime/lemon citrus fruit)"],
  [/\bcerejas?\b/gi, "cereja (cherry fruit)"],
  [/\bp[êe]ssegos?\b/gi, "pêssego (peach fruit)"],
  [/\bameixas?\b/gi, "ameixa (plum fruit)"],
  [/\bfigos?\b/gi, "figo (fig fruit)"],
  [/\bromãs?\b|\broman?s?\b/gi, "romã (pomegranate fruit)"],
  [/\bjabuticabas?\b/gi, "jabuticaba (jabuticaba Brazilian fruit)"],
  [/\bac[ae]rolas?\b/gi, "acerola (acerola fruit)"],
  [/\ba[cç]a[íi]s?\b/gi, "açaí (açaí berry bowl)"],

  // ===== PADARIA / PÃES / MASSAS DOCES =====
  [/\bbaguetes?\b/gi, "baguete (French baguette bread, long crusty loaf, golden crust, bakery bread, NOT a fruit)"],
  [/\bp[ãa]+es?\b/gi, "pão (bread loaf, bakery bread, NOT a fruit)"],
  [/\bp[ãa]o de queijo\b/gi, "pão de queijo (Brazilian cheese bread balls)"],
  [/\bcroissants?\b/gi, "croissant (buttery flaky French pastry)"],
  [/\bbriochas?\b/gi, "brioche (soft buttery French bread)"],
  [/\bciabattas?\b/gi, "ciabatta (Italian bread)"],
  [/\bfocaccias?\b/gi, "focaccia (Italian flatbread with olive oil)"],
  [/\bsourdoughs?\b|\bp[ãa]o de fermenta[cç][ãa]o natural\b/gi, "sourdough (sourdough artisan bread)"],
  [/\bbagels?\b/gi, "bagel (ring-shaped bread)"],
  [/\bpretzels?\b/gi, "pretzel (twisted baked pretzel)"],
  [/\bpita\b/gi, "pita (pita flatbread)"],
  [/\bnaan\b/gi, "naan (Indian flatbread)"],
  [/\btortilhas?\b|\btortillas?\b/gi, "tortilla (Mexican flatbread)"],
  [/\bcrepes?\b/gi, "crepe (thin French crepe)"],
  [/\bpanquecas?\b|\bpancakes?\b/gi, "pancake (fluffy pancake stack with syrup)"],
  [/\bwaffles?\b/gi, "waffle (golden Belgian waffle)"],
  [/\brosquinhas?\b|\bdonuts?\b/gi, "donut (glazed donut with sprinkles)"],
  [/\bmuffins?\b/gi, "muffin (baked muffin)"],
  [/\bcupcakes?\b/gi, "cupcake (frosted cupcake)"],
  [/\bbrownies?\b/gi, "brownie (chocolate fudge brownie)"],
  [/\btortas?\b/gi, "torta (pie/tart)"],
  [/\btarte?s?\b/gi, "tarte (tart with fruit topping)"],
  [/\bp[ãa]o doce\b/gi, "pão doce (sweet bread)"],
  [/\bbiscoitos?\b|\bcookies?\b/gi, "cookie (chocolate chip cookie)"],
  [/\bbolach(a|as)\b/gi, "bolacha (biscuit cracker)"],
  [/\bbolo\s+de\s+anivers[áa]rio\s+infantil\b/gi, "bolo de aniversário infantil (children birthday cake, multi-tier round cake with colorful fondant, cartoon themed decorations, sugar figurines, lit candles on top, sprinkles, buttercream rosettes, festive party background with balloons, sharp focus, professional food photography)"],
  [/\bbolo\s+de\s+anivers[áa]rio\b|\bbirthday\s+cakes?\b/gi, "bolo de aniversário (realistic birthday cake, round tiered cake with smooth buttercream frosting, decorative piping, fresh berries, lit candles, colorful sprinkles, cake stand on wooden table, soft warm lighting, macro food photography, NOT a fruit)"],
  [/\bbolo\s+de\s+casamento\b|\bwedding\s+cakes?\b/gi, "bolo de casamento (elegant multi-tier wedding cake, white fondant, sugar flowers, lace pattern, pearl details, cake topper, sophisticated reception background, soft natural light)"],
  [/\bbolo\s+de\s+chocolate\b|\bchocolate\s+cakes?\b/gi, "bolo de chocolate (rich chocolate layer cake, dark ganache drip, chocolate shavings, fresh strawberries on top, moist visible layers, plated slice, macro food photography)"],
  [/\bbolo\s+de\s+morango\b/gi, "bolo de morango (strawberry layered cake, fresh red strawberries, whipped cream, sponge layers, glossy red glaze, food photography)"],
  [/\bbolo\s+de\s+cenoura\b/gi, "bolo de cenoura (Brazilian carrot cake, orange sponge with thick chocolate frosting on top, sliced on plate)"],
  [/\bbolo\s+red\s+velvet\b|\bred\s+velvet\b/gi, "red velvet cake (deep red sponge layers, cream cheese frosting, crumb topping, plated slice)"],
  [/\bbolos?\b/gi, "bolo (realistic cake, round frosted layer cake with buttercream, decorative piping and toppings, plated on cake stand, professional food photography, NOT a fruit unless specified)"],
  [/\bcheesecakes?\b/gi, "cheesecake (creamy cheesecake slice)"],
  [/\btiramisu?\b/gi, "tiramisu (Italian tiramisu dessert)"],
  [/\bmacarons?\b/gi, "macaron (colorful French macaron)"],
  [/\b[ée]clairs?\b/gi, "éclair (French éclair pastry)"],
  [/\bstrudels?\b/gi, "strudel (apple strudel pastry)"],
  [/\bpudim\b/gi, "pudim (Brazilian flan caramel pudding)"],
  [/\bbrigadeiros?\b/gi, "brigadeiro (Brazilian chocolate truffle)"],
  [/\bbeijinhos?\b/gi, "beijinho (Brazilian coconut sweet)"],
  [/\bquindins?\b/gi, "quindim (Brazilian coconut egg yolk dessert)"],
  [/\bsorvetes?\b|\bice ?creams?\b/gi, "sorvete (ice cream scoop in cone)"],

  // ===== COMIDAS SALGADAS =====
  [/\bpizzas?\b/gi, "pizza (classic Italian pizza with melted cheese)"],
  [/\bhamb[uú]rgueres?\b|\bburgers?\b/gi, "hambúrguer (juicy gourmet burger)"],
  [/\bsanduich(e|es)\b|\bsanduba\b/gi, "sanduíche (sandwich with fillings)"],
  [/\bhot ?dogs?\b|\bcachorro[- ]quente\b/gi, "hot dog (hot dog with bun)"],
  [/\btacos?\b/gi, "taco (Mexican taco)"],
  [/\bburritos?\b/gi, "burrito (Mexican burrito)"],
  [/\bsushis?\b/gi, "sushi (sushi platter)"],
  [/\bsashimis?\b/gi, "sashimi (fresh sashimi slices)"],
  [/\bramen\b/gi, "ramen (Japanese ramen bowl)"],
  [/\bmacarr[ãa]o\b|\bpasta\b|\bspaghett?i\b/gi, "macarrão (pasta dish)"],
  [/\blasanhas?\b/gi, "lasanha (baked lasagna)"],
  [/\brisotos?\b/gi, "risoto (Italian risotto)"],
  [/\barroz\b/gi, "arroz (white rice)"],
  [/\bfeij[ãa]o\b/gi, "feijão (Brazilian beans)"],
  [/\bfeijoadas?\b/gi, "feijoada (Brazilian black bean stew)"],
  [/\bchurrascos?\b/gi, "churrasco (Brazilian barbecue grilled meat)"],
  [/\bpicanhas?\b/gi, "picanha (grilled picanha steak)"],
  [/\bcoxinhas?\b/gi, "coxinha (Brazilian chicken croquette)"],
  [/\bpast[eé]is?\b/gi, "pastel (Brazilian fried pastel)"],
  [/\bsalg?adinh?os?\b/gi, "salgadinho (Brazilian savory snack)"],
  [/\bom?elet[ea]s?\b/gi, "omelete (fluffy omelette)"],
  [/\bovos?\b/gi, "ovo (egg)"],
  [/\bsaladas?\b/gi, "salada (fresh salad bowl)"],
  [/\bsopas?\b/gi, "sopa (hot soup bowl)"],
  [/\bcaldos?\b/gi, "caldo (broth bowl)"],
  [/\bfrango\b/gi, "frango (chicken)"],
  [/\bpeixe\b/gi, "peixe (fish dish)"],
  [/\bcamar[ãa]o|camar[õo]es\b/gi, "camarão (shrimp)"],

  // ===== BEBIDAS =====
  [/\bcaf[eé]\b/gi, "café (cup of coffee with foam)"],
  [/\bch[áa]\b/gi, "chá (cup of tea)"],
  [/\bsucos?\b/gi, "suco (fresh juice glass)"],
  [/\bvitaminas?\b|\bsmoothies?\b/gi, "smoothie (fruit smoothie glass)"],
  [/\brefrigerantes?\b/gi, "refrigerante (soda glass with ice)"],
  [/\b[áa]guas?\b/gi, "água (glass of water)"],
  [/\bcervejas?\b/gi, "cerveja (cold beer mug)"],
  [/\bvinhos?\b/gi, "vinho (glass of wine)"],
  [/\bcaipirinhas?\b/gi, "caipirinha (Brazilian caipirinha cocktail)"],
  [/\bdrinks?\b|\bcocktails?\b/gi, "cocktail (cocktail glass)"],

  // ===== ANIMAIS =====
  [/\bcachorr[ao]s?\b/gi, "cachorro (domestic dog, Canis lupus familiaris): four legs, fur coat, wet nose, floppy or erect ears, expressive eyes, wagging tail, anatomically correct canine proportions"],
  [/\bgat[ao]s?\b/gi, "gato (domestic cat, Felis catus): four paws with retractable claws, soft fur, triangular ears, vertical slit pupils, long whiskers, long tail, agile feline anatomy"],
  [/\bcavalos?\b/gi, "cavalo (horse, Equus caballus): tall hooved mammal, flowing mane and tail, muscular body, four long legs with hooves, large nostrils, intelligent eyes, accurate equine proportions"],
  [/\bvacas?\b/gi, "vaca (cow, Bos taurus): large hooved cattle, black and white or brown patches, udder, curved horns or polled, broad muzzle, gentle eyes"],
  [/\bgalinhas?\b/gi, "galinha (hen, Gallus gallus domesticus): red comb and wattles, feathered body, small wings, scaly yellow legs, short beak"],
  [/\bararas?\s+azu(l|is)\b/gi, "arara-azul (Hyacinth Macaw, Anodorhynchus hyacinthinus): large parrot, entirely cobalt/violet-blue plumage, bright golden-yellow eye ring and matching crescent at base of lower mandible, massive jet-black hooked beak, dark grey feet"],
  [/\bararas?\b/gi, "arara (Brazilian macaw, Ara genus): large parrot with massive curved hooked beak, vivid red/yellow/blue plumage, long pointed tail feathers, zygodactyl feet"],
  [/\btucanos?\b/gi, "tucano (toco toucan, Ramphastos toco): glossy black body, white throat patch, red undertail coverts, enormous orange-yellow beak with black tip spot, bright blue bare skin around the eye"],
  [/\bbeija[- ]?flor(es)?\b/gi, "beija-flor (hummingbird, Trochilidae): tiny bird, iridescent metallic green/blue plumage, very long slender needle-like beak, rapidly blurred wings, hovering flight"],
  [/\bsabi[áa]s?\b/gi, "sabiá-laranjeira (rufous-bellied thrush, Turdus rufiventris): brown back and head, vivid orange-rufous belly, slender dark beak, dark eye"],
  [/\bcanari[oa]s?\b/gi, "canário-da-terra (saffron finch, Sicalis flaveola): bright yellow plumage, orange-tinted forehead and crown on males, conical seed-eating beak"],
  [/\bpassaros?\b|\bp[áa]ssaros?\b/gi, "pássaro (realistic bird with anatomically correct beak, feathers, wings, tail and clawed feet)"],
  [/\baguias?\b|\b[áa]guias?\b/gi, "águia (eagle, Accipitridae): large raptor, sharp curved yellow beak, piercing yellow eyes, broad powerful wings, strong talons, brown and white plumage"],
  [/\bcoelhos?\b/gi, "coelho (rabbit, Oryctolagus cuniculus): long upright ears, soft fur, short fluffy tail, powerful hind legs, twitching nose, small front paws"],
  [/\ble[ãa]o|le[õo]es\b/gi, "leão (African lion, Panthera leo): tawny golden coat, male with thick brown mane around head and shoulders, muscular feline body, tufted tail tip, powerful jaws"],
  [/\btigres?\b/gi, "tigre (Bengal tiger, Panthera tigris): orange coat with vertical black stripes, white belly, muscular feline body, large head, amber eyes, retractable claws"],
  [/\belefantes?\b/gi, "elefante (elephant, Loxodonta/Elephas): massive grey wrinkled skin, long muscular trunk, large fan-shaped ears, ivory tusks, columnar legs, small tail"],
  [/\burs[ao]s?\b/gi, "urso (bear, Ursidae): large heavy mammal, thick fur (brown/black/white), short rounded ears, small eyes, long muzzle, powerful paws with non-retractable claws"],
  [/\blobos?\b/gi, "lobo (gray wolf, Canis lupus): large canine, thick double-layered fur, erect triangular ears, amber/yellow eyes, bushy tail, slender muscular build"],
  [/\braposas?\b/gi, "raposa (red fox, Vulpes vulpes): small canine, reddish-orange fur, white chest and tail tip, pointed ears, slender muzzle, large bushy tail"],
  [/\bperuas?\b/gi, "perua (turkey, Meleagris gallopavo): large fowl, iridescent bronze-brown feathers, fan-shaped tail, red wattle and snood, bare blue head"],
  [/\bporcos?\b/gi, "porco (pig, Sus scrofa domesticus): stout body, pink or spotted skin, flat snout disc, small curly tail, cloven hooves, small upright or floppy ears"],
  [/\bovelhas?\b/gi, "ovelha (sheep, Ovis aries): woolly white fleece, slim legs, hooves, narrow face with horizontal slit pupils, sometimes curled horns"],
  [/\bborboletas?\b/gi, "borboleta (butterfly, Lepidoptera): two pairs of large symmetrical patterned wings covered in scales, slender body, long antennae with clubbed tips, proboscis"],
  [/\bgolfinh?os?\b/gi, "golfinho (bottlenose dolphin, Tursiops truncatus): smooth grey hydrodynamic body, curved dorsal fin, short rostrum beak, intelligent eyes, fluked tail"],
  [/\bbaleias?\b/gi, "baleia (whale, Cetacea): massive marine mammal, smooth dark skin, blowhole on top of head, large flippers, broad fluked tail, accurate cetacean proportions"],
  [/\btartarugas?\b/gi, "tartaruga (turtle, Testudines): hard patterned domed shell, scaly reptilian skin, four flippers or clawed legs, small head with beak-like mouth"],
  [/\bcobras?\b|\bserpentes?\b/gi, "cobra (snake, Serpentes): long limbless reptile, scaled skin in detailed patterns, forked tongue, lidless eyes, coiled posture"],
  [/\bmacacos?\b/gi, "macaco (monkey, Simiiformes): primate with long prehensile tail, dexterous hands and feet, expressive face, fur coat"],
  [/\bpinguins?\b/gi, "pinguim (penguin, Spheniscidae): upright flightless seabird, black back and head with white belly, flipper wings, webbed feet, short pointed beak"],

  // ===== OBJETOS / VEÍCULOS / LUGARES =====
  [/\bcarr[ao]s?\b/gi, "carro (modern automobile sedan, four wheels with rubber tires, glass windshield and windows, painted metal body, headlights, side mirrors, license plate, accurate vehicle proportions)"],
  [/\bmotos?\b/gi, "moto (motorcycle, two wheels, fuel tank, handlebars with grips and mirrors, single headlight, exposed engine, leather seat, exhaust pipe)"],
  [/\bbicicletas?\b/gi, "bicicleta (bicycle, two spoked wheels of equal size, diamond frame, handlebars, pedals with chain drive, leather saddle, brakes)"],
  [/\bavi[õo]es?\b/gi, "avião (commercial airliner, sleek aluminum fuselage, two swept wings with jet engines, tail fin with horizontal stabilizers, cockpit windows, landing gear)"],
  [/\bnavios?\b/gi, "navio (large ship, steel hull, multiple decks, smokestacks, bridge tower, portholes, anchor, ocean waves"],
  [/\bbarcos?\b/gi, "barco (wooden or fiberglass boat, hull, deck, mast or outboard motor, calm water reflection)"],
  [/\btrens?\b/gi, "trem (train, locomotive engine pulling carriages, steel wheels on rails, windows, headlight)"],
  [/\bcas[ao]s?\b/gi, "casa (residential house, pitched roof with tiles or shingles, windows with frames, front door, walls of brick or siding, chimney, garden)"],
  [/\bpr[eé]dios?\b/gi, "prédio (modern multi-story building, glass facade or concrete walls, regular grid of windows, entrance lobby, urban setting)"],
  [/\bigrejas?\b/gi, "igreja (church, tall bell tower, pointed arches, stained-glass windows, cross on top, stone or brick facade)"],
  [/\bcastelos?\b/gi, "castelo (medieval stone castle, tall crenellated towers with conical roofs, fortified walls, drawbridge, narrow arrow-slit windows)"],
  [/\bpontes?\b/gi, "ponte (bridge, suspension cables or stone arches, roadway deck, support pillars, river or valley underneath)"],
  [/\bpraias?\b/gi, "praia (beach landscape, golden sand, turquoise ocean waves, palm trees, blue sky, gentle horizon)"],
  [/\bmontanhas?\b/gi, "montanha (mountain landscape, snow-capped rocky peaks, pine forest slopes, dramatic sky, alpine scenery)"],
  [/\bflorestas?\b/gi, "floresta (dense forest, tall trees with green canopy, sunlight filtering through leaves, moss-covered ground, undergrowth)"],
  [/\bflor(es)?\b/gi, "flor (blooming flower, detailed petals, stamen and pistil, green stem and leaves, botanically accurate)"],
  [/\b[áa]rvores?\b/gi, "árvore (large mature tree, textured bark trunk, branching limbs, full green leafy canopy, visible roots)"],
  [/\brel[oó]gios?\b/gi, "relógio (wristwatch or wall clock, circular dial, hour and minute hands, numeric or marker indices, precise mechanical design)"],
  [/\blivros?\b/gi, "livro (book, hardcover with printed title on spine, visible pages, slight shadow, realistic paper texture)"],
  [/\bcelulares?\b|\bsmartphones?\b/gi, "celular (modern smartphone, rectangular slab, edge-to-edge glass display, rear camera module, metal frame)"],
  [/\bcomputadores?\b|\bnotebooks?\b|\blaptops?\b/gi, "notebook (modern laptop computer, thin aluminum body, open clamshell with backlit keyboard and high-resolution display)"],
  [/\bviol[ãa]o\b|\bviolas?\b/gi, "violão (acoustic guitar, hollow wooden body with soundhole, fretted neck with six strings, tuning pegs on headstock)"],
  [/\bguitarras?\b/gi, "guitarra (electric guitar, solid body, fretted neck with six strings, magnetic pickups, volume knobs, output jack)"],
  [/\bpianos?\b/gi, "piano (grand or upright piano, polished black or wooden finish, white and black keys, music stand, pedals)"],

  // ===== TRABALHO / PROFISSÕES =====
  [/\badvogad[ao]s?\b/gi, "advogado (lawyer professional, tailored dark suit and tie, white shirt, holding legal documents or law book, courtroom or law office background, confident posture, realistic adult human anatomy)"],
  [/\bm[eé]dic[ao]s?\b/gi, "médico (medical doctor, white lab coat over scrubs, stethoscope around neck, hospital badge, hospital corridor background, realistic adult human anatomy)"],
  [/\benfermeir[ao]s?\b/gi, "enfermeiro (nurse, colored scrubs uniform, hospital ID badge, stethoscope or clipboard, hospital background, realistic adult anatomy)"],
  [/\bprofessor(es|as?)?\b/gi, "professor (teacher, smart casual blazer and shirt, holding book or pointing at whiteboard, classroom background with desks, realistic adult anatomy)"],
  [/\bpolic(iais?|ial)\b/gi, "policial (police officer, dark blue uniform with badge and patches, duty belt, peaked cap, urban background, realistic adult anatomy)"],
  [/\bbombeiros?\b/gi, "bombeiro (firefighter, yellow reflective bunker gear, helmet, oxygen tank, holding hose or axe, fire truck background, realistic adult anatomy)"],
  [/\bchefs?\b|\bcozinheir[ao]s?\b/gi, "chef (professional chef, white double-breasted chef jacket, tall white toque hat, holding knife or pan, stainless steel kitchen background, realistic adult anatomy)"],
  [/\bengenheir[ao]s?\b/gi, "engenheiro (engineer, hard hat, safety vest, holding blueprints or tablet, construction site or factory background, realistic adult anatomy)"],
  [/\barquitet[ao]s?\b/gi, "arquiteto (architect, smart casual attire, holding architectural blueprints or scale model, drafting table background, realistic adult anatomy)"],
  [/\bdentistas?\b/gi, "dentista (dentist, light blue scrubs, surgical mask down, dental loupes, dental chair background, realistic adult anatomy)"],
  [/\bmec[aâ]nic[ao]s?\b/gi, "mecânico (mechanic, blue work overalls, tools in hand, auto repair garage background with car on lift, realistic adult anatomy)"],
];


function normalizePromptTypos(raw: string): string {
  let out = (raw || "").trim();
  if (!out) return out;
  for (const [re, rep] of PROMPT_TYPO_MAP) out = out.replace(re, rep);
  return out;
}

// Detecta cores explicitamente pedidas pelo usuário (pt-BR / en) e devolve
// uma diretiva forte para garantir que o gerador respeite a tonalidade.
const USER_COLOR_MAP: Array<[RegExp, string]> = [
  [/\b(azul|azuis|blue|azulado[ao]?|azulada)\b/i, "blue (#1e88e5, vivid blue tones)"],
  [/\b(vermelh[ao]s?|red|avermelhad[ao]s?)\b/i, "red (#e53935, vivid red tones)"],
  [/\b(verde[s]?|green|esverdead[ao]s?)\b/i, "green (#43a047, vivid green tones)"],
  [/\b(amarel[ao]s?|yellow)\b/i, "yellow (#fdd835, vivid yellow tones)"],
  [/\b(rosa|pink|rosad[ao]s?)\b/i, "pink (#ec407a, vivid pink tones)"],
  [/\b(rox[ao]s?|lil[áa]s|purple|violet[ao]?|violeta)\b/i, "purple/violet (#8e24aa, vivid purple tones)"],
  [/\b(laranja|orange|alaranjad[ao]s?)\b/i, "orange (#fb8c00, vivid orange tones)"],
  [/\b(pret[ao]s?|negr[ao]s?|black)\b/i, "black (#111111, deep black tones)"],
  [/\b(branc[ao]s?|white)\b/i, "white (#fafafa, clean white tones)"],
  [/\b(cinza|cinzent[ao]s?|gray|grey)\b/i, "gray (#9e9e9e)"],
  [/\b(marrom|castanh[ao]s?|brown)\b/i, "brown (#6d4c41)"],
  [/\b(dourad[ao]s?|gold|golden|ouro)\b/i, "gold (#d4af37, metallic gold)"],
  [/\b(pratead[ao]s?|prata|silver)\b/i, "silver (#bdbdbd, metallic silver)"],
  [/\b(turquesa|turquoise|ciano|cyan)\b/i, "turquoise/cyan (#26c6da)"],
  [/\b(magenta|fucsia|f[úu]csia)\b/i, "magenta (#d81b60)"],
];

function extractUserColors(prompt: string): string {
  const found: string[] = [];
  for (const [re, label] of USER_COLOR_MAP) {
    if (re.test(prompt) && !found.includes(label)) found.push(label);
  }
  return found.join(" + ");
}

function withColorLock(prompt: string): string {
  const colors = extractUserColors(prompt);
  if (!colors) return prompt;
  return `${prompt}. STRICT COLOR LOCK: the main subject MUST be predominantly ${colors}. Apply this color to the primary surfaces (wings/feathers/petals/body/material) of the requested subject. Do not default to natural/generic coloring; the user explicitly asked for this color. negative colors: any other dominant hue that contradicts ${colors}.`;
}


function withFaceSafety(prompt: string) {
  const colored = withColorLock(prompt);
  if (isScenerySubject(colored)) {
    return `${colored}. NATURAL LANDSCAPE LOCK: render a real outdoor landscape/sky phenomenon exactly as described. For sunset/sunrise: show the real sun near the horizon, illuminated clouds, warm atmospheric light, natural sky gradients, realistic terrain/ocean/mountains if implied. Do not add people, faces, eyes, mouths, portraits, silhouettes, hands, fingers, skin, body parts, anthropomorphic shapes, or face-like patterns in the sun or clouds.`;
  }
  if (!hasHumanSubject(colored)) {
    return `${colored}. Standalone subject lock: render strictly and only what the user described, with correct real-world structure, materials AND COLORS. PHOTOREALISM LOCK: ultra-realistic professional product photography, RAW DSLR (Canon EOS R5 / Sony A7R IV), 85mm macro lens, f/5.6, ISO 100, studio softbox + natural light, true-to-life materials (metal reflections, wood grain, glass refractions, fabric weave, ceramic glaze, leather pores), accurate physically-based shading, soft realistic shadows and contact occlusion, sharp tack-focus on subject with subtle depth of field, 8K ultra high resolution, ultra-detailed micro-textures, no smoothing, no plastic look, no CGI, no 3D render, no cartoon, no illustration, no painting, no AI look. Do not add unrelated items, do not add fruits or food unless the user explicitly asked for them, do not add people, faces, skin, arms, hands, fingers, body parts, portraits, or anthropomorphic features. Negative: blurry, low-res, low quality, jpeg artifacts, oversharpened, plastic, waxy, fake, cartoon, CGI, 3D render, illustration, painting, watermark, text, logo.`;
  }
  return `${colored}. FACE FIRST MODE: prioritize correct facial anatomy over style, background, props and decorative details. ${FACE_SAFE_PROMPT} ${HAND_SAFE_PROMPT} Negative face anatomy: ${FACE_NEGATIVE_PROMPT}. Negative hand anatomy: ${HAND_NEGATIVE_PROMPT}.`;
}


function handInstructionFor(prompt: string) {
  if (EATING_CAKE_RE.test(prompt)) {
    return "Cake-eating interaction lock: render the birthday cake eating scene like a real documentary photo, but protect anatomy by using a medium close-up or waist-up crop with wrists partly hidden by the table edge. Show cake on a plate or fork/spoon near the mouth; avoid close-up fingers. If a hand is visible, show only one natural hand holding a fork or plate with all fingers plausible, exactly five fingers, correct thumb placement, no merged fingers, no cake fused with skin, no extra hands, no duplicated hands.";
  }
  if (HANDS_ARE_REQUESTED.test(prompt)) {
    return "Visible hands were requested: render only necessary hands, fully visible where possible, photorealistic and anatomically normal. Each visible hand must have exactly five fingers: one opposable thumb and four fingers, correct thumb angle, middle finger longest, ring/index slightly shorter, pinky shortest, natural knuckles, natural creases, realistic nails, believable palm, and correct wrist connection. Perform a final finger-count anatomy check before output.";
  }
  return "Hands were not requested: use a chest-up, head-and-shoulders, above-the-wrist crop, or hide hands behind clothing, pockets, folders, desks, books, or frame edges. Do not render loose fingers, partial fingers, accidental hands, or hands at image edges.";
}

// ---------- chat completions ----------

async function chatLovable(opts: ChatOptions) {
  if (!LOVABLE_KEY) return { ok: false as const, status: 0, error: "LOVABLE_API_KEY ausente" };
  const model = toLovableChatModel(opts.model);
  try {
    const resp = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        ...(opts.response_format ? { response_format: opts.response_format } : {}),
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
        ...(typeof opts.maxTokens === "number" ? { max_tokens: opts.maxTokens } : {}),
      }),
    }, opts.timeoutMs || 20000);
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    return { ok: true as const, data: await resp.json(), provider: "lovable", model };
  } catch (error) {
    return { ok: false as const, status: 0, error: String(error instanceof Error ? error.message : error) };
  }
}

async function chatLovableOpenAIResponses(opts: ChatOptions, model: string) {
  const systemMessages: string[] = [];
  const input = opts.messages.map((message) => {
    const content = messageToText(message.content);
    if (message.role === "system") {
      systemMessages.push(content);
      return null;
    }
    return {
      role: message.role === "assistant" ? "assistant" : "user",
      content,
    };
  }).filter(Boolean);

  try {
    const resp = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
      body: JSON.stringify({
        model,
        input,
        ...(systemMessages.length ? { instructions: systemMessages.join("\n\n") } : {}),
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
        ...(typeof opts.maxTokens === "number" ? { max_output_tokens: opts.maxTokens } : {}),
      }),
    }, opts.timeoutMs || 20000);
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text(), model };
    const data = await resp.json();
    const content = extractResponsesText(data);
    return {
      ok: true as const,
      data: { choices: [{ message: { role: "assistant", content } }] },
      provider: "lovable",
      model,
    };
  } catch (error) {
    return { ok: false as const, status: 0, error: String(error instanceof Error ? error.message : error), model };
  }
}

function messageToText(content: any) {
  return typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((p: any) => p?.text || p?.content || "").filter(Boolean).join("\n")
      : String(content || "");
}

function extractResponsesText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  const parts: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") parts.push(content.text);
      else if (typeof content?.content === "string") parts.push(content.content);
    }
  }
  return parts.join("").trim();
}

const LOVABLE_CHAT_MODELS = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.5-flash",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5.2",
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.4-nano",
  "openai/gpt-5.5",
]);

function isClaudeModel(model = "") {
  return /(^|\/)claude/i.test(model.trim());
}

function toLovableChatModel(model = "") {
  const requested = model.trim();
  if (LOVABLE_CHAT_MODELS.has(requested)) return requested;
  // Claude não existe no Lovable AI Gateway deste projeto; quando o usuário
  // escolhe Claude e a chave Emergent não aceita o modelo, o fallback real é Gemini.
  if (isClaudeModel(requested)) return "google/gemini-2.5-flash";
  if (/^gpt-4o(?:-mini)?$/i.test(requested)) return "openai/gpt-5-mini";
  return "google/gemini-2.5-flash";
}

function messagesToGeminiContents(messages: ChatMessage[]) {
  const system: string[] = [];
  const contents: any[] = [];
  for (const m of messages) {
    const text = messageToText(m.content);
    if (m.role === "system") { system.push(text); continue; }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }
  return { system: system.join("\n\n"), contents };
}

async function chatGemini(opts: ChatOptions) {
  if (!GEMINI_KEY) return { ok: false as const, status: 0, error: "GEMINI_API_KEY ausente" };
  const { system, contents } = messagesToGeminiContents(opts.messages);
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const body: any = { contents };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (opts.response_format?.type === "json_object") {
    body.generationConfig = { responseMimeType: "application/json" };
  }
  if (typeof opts.temperature === "number") {
    body.generationConfig = { ...(body.generationConfig || {}), temperature: opts.temperature };
  }
  if (typeof opts.maxTokens === "number") {
    body.generationConfig = { ...(body.generationConfig || {}), maxOutputTokens: opts.maxTokens };
  }
  try {
    const resp = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, opts.timeoutMs || 20000);
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    // Wrap into OpenAI-compatible shape so callers can read choices[0].message.content
    return {
      ok: true as const,
      provider: "gemini",
      model,
      data: { choices: [{ message: { role: "assistant", content: text } }] },
    };
  } catch (error) {
    return { ok: false as const, status: 0, error: String(error instanceof Error ? error.message : error) };
  }
}

async function chatEmergent(opts: ChatOptions) {
  if (!EMERGENT_KEY) return { ok: false as const, status: 0, error: "EMERGENT_API_KEY ausente" };
  let lastError = "";
  let lastStatus = 0;
  for (const model of emergentCandidates(opts.model)) try {
    const resp = await fetchWithTimeout("https://integrations.emergentagent.com/llm/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMERGENT_KEY}` },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        ...(opts.response_format ? { response_format: opts.response_format } : {}),
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
        ...(typeof opts.maxTokens === "number" ? { max_tokens: opts.maxTokens } : {}),
      }),
    }, opts.timeoutMs || 20000);
    if (!resp.ok) {
      lastStatus = resp.status;
      lastError = await resp.text();
      if (resp.status === 400 || resp.status === 404) {
        console.warn(`⚠️ Emergent rejeitou o modelo ${model}, tentando próximo:`, resp.status, lastError.slice(0, 180));
        continue;
      }
      return { ok: false as const, status: resp.status, error: lastError, model };
    }
    return { ok: true as const, data: await resp.json(), provider: "emergent", model };
  } catch (error) {
    lastStatus = 0;
    lastError = String(error instanceof Error ? error.message : error);
  }
  return { ok: false as const, status: lastStatus, error: lastError || "Nenhum modelo Emergent aceito" };
}

function emergentCandidates(model = "") {
  const requested = model.trim();
  const base = requested.replace(/^(anthropic|openai|google)\//i, "");
  const candidates = isClaudeModel(requested)
    ? [
        requested,
        base,
        "claude-sonnet-4-5",
        "claude-sonnet-4-5-20250929",
        "claude-haiku-4-5",
      ]
    : /^gpt-4o(?:-mini)?$/i.test(base)
      ? [base]
      : requested
        ? [requested, base, "gpt-4o-mini"]
        : ["gpt-4o-mini"];
  return [...new Set(candidates.filter(Boolean))];
}

async function chatGeminiFallbackForClaude(opts: ChatOptions) {
  const fallbackOpts = {
    ...opts,
    model: "google/gemini-2.5-flash",
    timeoutMs: Math.max(opts.timeoutMs || 20000, 20000),
  };
  if (GEMINI_KEY) {
    const direct = await chatGemini(fallbackOpts);
    if (direct.ok) return direct;
    console.warn("⚠️ Claude via Emergent falhou; Gemini direto também falhou:", direct.status, direct.error?.slice?.(0, 200));
  }
  if (LOVABLE_KEY) {
    const gateway = await chatLovable(fallbackOpts);
    if (gateway.ok) return gateway;
    console.warn("⚠️ Claude via Emergent falhou; Lovable/Gemini também falhou:", gateway.status, gateway.error?.slice?.(0, 200));
  }
  return null;
}

function isUnsupportedOllamaHost(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local");
  } catch {
    return true;
  }
}

async function chatOllama(opts: ChatOptions) {
  if (!OLLAMA_URL) return { ok: false as const, status: 0, error: "OLLAMA_URL ausente" };
  if (isUnsupportedOllamaHost(OLLAMA_URL)) {
    return { ok: false as const, status: 0, error: "OLLAMA_URL precisa ser uma URL pública acessível pelo backend" };
  }
  const controller = new AbortController();
  const timeoutMs = Math.max(4000, Math.min(30000, opts.timeoutMs || Number(Deno.env.get("OLLAMA_CHAT_TIMEOUT_MS") || 30000)));
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(OLLAMA_API_KEY ? { Authorization: `Bearer ${OLLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: opts.messages.map((message) => ({ role: message.role, content: String(message.content || "") })),
        stream: false,
        ...(opts.response_format?.type === "json_object" ? { format: "json" } : {}),
        options: {
          temperature: typeof opts.temperature === "number" ? opts.temperature : 0.7,
          ...(typeof opts.maxTokens === "number" ? { num_predict: opts.maxTokens } : {}),
        },
      }),
    });
    const text = await resp.text();
    if (!resp.ok) return { ok: false as const, status: resp.status, error: text };
    const data = JSON.parse(text || "{}");
    const content = data?.message?.content || data?.response || "";
    return {
      ok: true as const,
      provider: "ollama",
      data: { choices: [{ message: { role: "assistant", content } }] },
    };
  } catch (error) {
    return { ok: false as const, status: 0, error: String(error instanceof Error ? error.message : error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function chatCompletion(opts: ChatOptions) {
  // Permite forçar um provider específico (ex.: "emergent" para análise de casos).
  if (opts.preferProvider && opts.preferProvider !== "auto") {
    if (opts.preferProvider === "emergent") {
      const r = await chatEmergent(opts);
      if (r.ok) return r;
      console.warn("⚠️ Emergent (forçado) falhou, caindo para fallback:", r.status, r.error?.slice?.(0, 200));
      if (isClaudeModel(opts.model || "")) {
        const geminiFallback = await chatGeminiFallbackForClaude(opts);
        if (geminiFallback?.ok) return geminiFallback;
      }
    } else if (opts.preferProvider === "lovable" && LOVABLE_KEY) {
      const r = await chatLovable(opts); if (r.ok) return r;
    } else if (opts.preferProvider === "gemini" && GEMINI_KEY) {
      const r = await chatGemini(opts); if (r.ok) return r;
    } else if (opts.preferProvider === "ollama" && OLLAMA_URL) {
      const r = await chatOllama(opts); if (r.ok) return r;
    }
  }
  // Para voz/atendimento ao vivo, prioriza provedores cloud rápidos antes do Ollama local/ngrok.
  if (opts.preferFastProvider) {
    if (LOVABLE_KEY) {
      const r = await chatLovable(opts);
      if (r.ok) return r;
      console.warn("⚠️ Lovable chat rápido falhou, tentando Gemini/Ollama:", r.status, r.error?.slice?.(0, 200));
    }
    if (GEMINI_KEY) {
      const r = await chatGemini(opts);
      if (r.ok) return r;
      console.warn("⚠️ Gemini rápido falhou, tentando Ollama/Emergent:", r.status, r.error?.slice?.(0, 200));
    }
    if (OLLAMA_URL) {
      const r = await chatOllama(opts);
      if (r.ok) return r;
      console.warn("⚠️ Ollama rápido falhou, tentando Emergent:", r.status, r.error?.slice?.(0, 200));
    }
    const r3 = await chatEmergent(opts);
    if (r3.ok) return r3;
    return { ok: false as const, status: r3.status || 502, error: r3.error || "Nenhum provider rápido disponível", provider: "none" };
  }
  // Order: Ollama → Lovable → Gemini (direct) → Emergent
  if (OLLAMA_URL) {
    const r = await chatOllama(opts);
    if (r.ok) return r;
    console.warn("⚠️ Ollama falhou, tentando Lovable/Gemini/Emergent:", r.status, r.error?.slice?.(0, 200));
  }
  if (LOVABLE_KEY) {
    const r = await chatLovable(opts);
    if (r.ok) return r;
    console.warn("⚠️ Lovable chat falhou, tentando Gemini direto:", r.status, r.error?.slice?.(0, 200));
  }
  if (GEMINI_KEY) {
    const r = await chatGemini(opts);
    if (r.ok) return r;
    console.warn("⚠️ Gemini direto falhou, tentando Emergent:", r.status, r.error?.slice?.(0, 200));
  }
  const r3 = await chatEmergent(opts);
  if (r3.ok) return r3;
  return { ok: false as const, status: r3.status || 502, error: r3.error || "Nenhum provider disponível", provider: "none" };
}

// ---------- text-to-image ----------

async function imageLovable(opts: ImageOptions) {
  if (!LOVABLE_KEY) return { ok: false as const, error: "LOVABLE_API_KEY ausente" };
  const safePrompt = opts.prompt;
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt: safePrompt,
      quality: opts.quality || "high",
      size: opts.size || "1536x1536",
      stream: false,
    }),
  });
  if (!resp.ok) return { ok: false as const, error: `Lovable ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
  const data = await resp.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return { ok: false as const, error: "Lovable não retornou imagem" };
  return { ok: true as const, b64, provider: "lovable" };
}

async function imageGemini(opts: ImageOptions) {
  if (!GEMINI_KEY) return { ok: false as const, error: "GEMINI_API_KEY ausente" };
  const model = "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const safePrompt = opts.prompt;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: safePrompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!resp.ok) return { ok: false as const, error: `Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
  const b64 = inline?.inlineData?.data || inline?.inline_data?.data;
  if (!b64) return { ok: false as const, error: "Gemini direto não retornou imagem" };
  return { ok: true as const, b64, provider: "gemini" };
}

async function imageEmergent(opts: ImageOptions) {
  if (!EMERGENT_KEY) return { ok: false as const, error: "EMERGENT_API_KEY ausente" };
  const safePrompt = opts.prompt;
  const models = ["vertex_ai/gemini-2.5-flash-image", "vertex_ai/gemini-3.1-flash-image-preview"];
  let lastError = "";
  for (const model of models) {
    const resp = await fetchWithTimeout("https://integrations.emergentagent.com/llm/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMERGENT_KEY}` },
      body: JSON.stringify({
        model,
        modalities: ["image", "text"],
        messages: [{ role: "user", content: safePrompt }],
      }),
    }, 45000);
    if (!resp.ok) {
      lastError = `Emergent ${model} ${resp.status}: ${(await resp.text()).slice(0, 240)}`;
      continue;
    }
    const data = await resp.json();
    const msg = data?.choices?.[0]?.message;
    const url = msg?.images?.[0]?.image_url?.url || msg?.images?.[0]?.url || "";
    const b64 = String(url).match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/)?.[1]
      || String(msg?.content || "").match(/data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/)?.[1];
    if (b64) return { ok: true as const, b64, provider: "emergent" };
    lastError = `Emergent ${model} não retornou imagem`;
  }
  return { ok: false as const, error: lastError || "Emergent não retornou imagem" };
}

const compactText = (value: string, max = 420) => (value || "")
  .replace(/\[[^\]]+\]/g, " ")
  .replace(/\b(FACE|HAND|ANATOMY|REALISM|Negative|SUBJECT|OBJECT|EVENT|SURREAL|CAKE)[^.:\n]{0,80}[:.]/gi, " ")
  .replace(/--[a-z0-9_-]+(?:\s+[a-z0-9_-]+)?/gi, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, max)
  .replace(/[,.;:\s]+$/g, "");

// Prompt curto para Pollinations/Flux. Esse provider usa URL GET; prompts longos dão HTTP 414.
function buildFluxPrompt(raw: string): string {
  const fixed = normalizePromptTypos(raw);
  const base = compactText(fixed, 360);

  // Forensic/legal context: bruises, injuries, domestic violence evidence imagery.
  const isForensic = /\b(viol[êe]ncia|agress[ãa]o|agredid[ao]|hematoma|ematoma|machucad[ao]|les[ãa]o|les[õo]es|ferid[ao]|ferimento|cicatriz|soco|chute|tapa|espancad[ao]|abuso|dom[ée]stica|bruise|bruised|injur(y|ies)|wound|assault|battered|forensic|per[íi]cia|laudo)\b/i.test(base);
  if (isForensic) {
    const FORENSIC = "realistic forensic documentary photo, clinical neutral light, plain background, accurate bruises/injuries, respectful legal evidence style";
    const NEG = "negative: cartoon, glamour, gore, deformed anatomy, text, watermark";
    return `${base}. ${FORENSIC}. ${NEG}`;
  }



  // Non-human subjects (fruit, objects, scenery): keep prompt faithful, no portrait lock.
  if (!hasHumanSubject(base)) {
    if (isScenerySubject(base)) {
      return `${base}, photorealistic natural landscape photography, real sky, real sun, warm golden atmospheric light, illuminated clouds, natural horizon, realistic colors and shadows, high detail, sharp focus. Landscape lock: no humans, no people, no face in the sun, no face in clouds, no eyes, no mouth, no portrait, no silhouettes, no hands, no fingers, no body parts, no anthropomorphic or surreal elements. negative: human, person, face, eyes, mouth, portrait, body parts, anthropomorphic sun, face-shaped clouds, cartoon, CGI, text, watermark, logo`;
    }
    const isFruit = /\b(fruit|apple|maçã|maca|banana|laranja|orange|uva|grape|morango|strawberry|abacaxi|pineapple|melancia|watermelon|mam[ãa]o|papaya|pera|pear|manga|mango|lim[ãa]o|lemon|p[êe]ssego|peach|cereja|cherry|kiwi)\b/i.test(base);
    const isLandmark = /\b(torre\s+eiffel|eiffel\s+tower|cristo\s+redentor|estatua\s+da\s+liberdade|statue\s+of\s+liberty|big\s+ben|coliseu|colosseum|taj\s+mahal|pir[âa]mide|pyramid|monumento|monument|cathedral|catedral|igreja|church|castelo|castle|ponte|bridge|arranha-c[ée]u|skyscraper|edif[íi]cio|building|pr[ée]dio|arquitetura|architecture|landmark|skyline|cidade|city|paisagem urbana)\b/i.test(base);
    const SUBJECT_WORD = isFruit ? "fruit" : (isLandmark ? "landmark/architectural structure" : "object");
    const FRUIT_STYLE = isFruit
      ? ", whole intact fruit, perfectly ripe, smooth natural skin, anatomically correct natural shape, intact stem, no bites, no cuts, no deformation, studio product photography, soft diffused lighting, clean white background, macro detail"
      : "";
    const LANDMARK_STYLE = isLandmark
      ? ", architectural photography, accurate proportions, true-to-life structure, recognizable silhouette, real-world location, no fantasy elements, no surreal additions"
      : "";
    const OBJECT_LOCK = `Subject lock: only the requested ${SUBJECT_WORD}, correct structure/materials; no unrelated items, fruit/food unless requested, people, faces, hands or body parts.`;
    const STYLE = `photorealistic, high detail, natural light, sharp focus${FRUIT_STYLE}${LANDMARK_STYLE}, isolated standalone subject, clear silhouette, no human presence`;
    const extraNeg = isFruit ? "" : ", fruit, apple, banana, orange, food, produce, fruit basket, random fruit added to scene";
    const NEG = `negative: blurry, low quality, text, watermark, logo, deformed, cartoon, CGI, human hands, fingers, face, person, anthropomorphic, unrelated objects${extraNeg}`;
    return `${base}, ${STYLE}. ${OBJECT_LOCK} ${NEG}`;

  }

  const HAND_DETAIL = "natural hands only if needed, five fingers, correct thumb, no extra or fused fingers";
  const BODY_DETAIL = "anatomically correct human body, natural proportions and posture, no extra or missing limbs";
  const isEatingCake = EATING_CAKE_RE.test(base);
  const isMultiPerson = /\b(people|persons|pessoas|crowd|multid[ãa]o|grupo|group|family|fam[íi]lia|couple|casal|tourists|turistas|friends|amigos)\b/i.test(base);
  const isFullBody = isMultiPerson || /\b(full body|corpo inteiro|de corpo inteiro|standing|walking|running|sentad[ao]|de p[ée]|andando|correndo|posando|posing|dan[çc]ando|dancing|jogando|playing|na frente|in front of|na torre|at the tower|no monumento|at the monument|na praia|at the beach|na rua|on the street|na cidade|in the city|landmark|eiffel|cristo redentor|coliseu|colosseum|big ben|taj mahal)\b/i.test(base);
  const subjectClause = isMultiPerson
    ? "multiple realistic human subjects, each with consistent anatomy"
    : "single real human subject";
  const compositionClause = isEatingCake
    ? "documentary birthday cake eating composition: medium close-up at dining table, faces and cake clearly visible, wrists cropped or hidden by table edge, fork/spoon and cake slice used to imply eating, no finger close-up"
    : isFullBody
    ? "wide full-body composition with environment visible, subjects positioned naturally within the scene, complete bodies (head, torso, arms, legs, hands and feet all visible and anatomically correct)"
    : "chest-up composition, hands preferably out of frame";
  const STYLE =
    `${subjectClause}, RAW photorealistic DSLR photo, ${isFullBody ? "35mm" : "85mm"} lens, natural light, ` +
    "real skin texture, correct face, aligned eyes, centered pupils, natural nose, mouth and teeth, " +
    `${compositionClause}, ` +
    (isFullBody || isEatingCake ? BODY_DETAIL + ", " : "") +
    "if hands appear they must pass strict anatomy: " +
    HAND_DETAIL + ", " +
    "cinematic natural lighting, sharp focus, 8k, unedited, no beauty filter, no AI-generated look";
  const BODY_NEG = isFullBody || isEatingCake
    ? ", deformed body, bad anatomy, wrong proportions, extra limbs, missing limbs, fused limbs, impossible pose"
    : "";
  const NEG = `negative: blurry, low quality, deformed face, asymmetrical eyes, cross-eyed, extra eyes, double nose, double mouth, bad teeth, plastic skin, CGI, cartoon, illustration${BODY_NEG}, bad hands, extra fingers, missing fingers, fused fingers, text, watermark, logo`;
  const handsClause = isEatingCake
    ? `${handInstructionFor(base)} ${HAND_DETAIL}. Keep cake, fork, plate and fingers separated with correct contact shadows; never merge cake frosting with hands, mouth, arms, or skin.`
    : isFullBody
    ? `${HAND_DETAIL}. Hands and feet must be fully formed and natural — not melted, not warped, not fused.`
    : `${handInstructionFor(base)} ${HAND_SAFE_PROMPT} ${HAND_DETAIL}.`;
  return `${base}, ${STYLE}. ${handsClause} ${NEG}`;

}



// Pollinations.ai — API pública, gratuita, sem chave, sem créditos.
async function imagePollinations(opts: ImageOptions) {
  try {
    const [w, h] = (opts.size || "1536x1536").split("x").map((n) => parseInt(n, 10) || 1536);
    const seed = Math.floor(Math.random() * 1_000_000);
    const humanSubject = hasHumanSubject(opts.prompt);
    const flux = compactText(buildFluxPrompt(opts.prompt), humanSubject ? 560 : 440);
    const model = humanSubject ? "flux-realism" : "flux";
    const negative = humanSubject
      ? "deformed face, bad eyes, cross-eyed, bad hands, extra fingers, missing limbs, cartoon, CGI, text, watermark, logo"
      : "human, person, face, hands, fingers, body parts, fruit or food unless requested, cartoon, CGI, text, watermark, logo";
    const enhance = humanSubject ? "false" : "true";
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(flux)}?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=${enhance}&model=${model}&negative=${encodeURIComponent(negative)}`;
    const resp = await fetch(url);
    if (!resp.ok) return { ok: false as const, error: `Pollinations ${resp.status}` };
    const buf = new Uint8Array(await resp.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { ok: true as const, b64: btoa(bin), provider: "pollinations" };
  } catch (e) {
    return { ok: false as const, error: String((e as Error)?.message || e) };
  }
}

export async function generateImage(opts: ImageOptions) {
  const humanSubject = hasHumanSubject(opts.prompt);
  const faceSafeOpts = { ...opts, prompt: withFaceSafety(opts.prompt), quality: opts.quality || (humanSubject ? "high" : undefined) };
  const pref = opts.preferProvider || "auto";

  // Provider explícito: respeita escolha do usuário sem fallback automático para pagos.
  if (pref === "pollinations") {
    const r = await imagePollinations(faceSafeOpts);
    if (r.ok) return r;
    return { ok: false as const, error: r.error || "Pollinations falhou", provider: "pollinations" };
  }
  if (pref === "emergent") {
    if (!EMERGENT_KEY) return { ok: false as const, error: "EMERGENT_API_KEY ausente", provider: "emergent" };
    const r = await imageEmergent(faceSafeOpts);
    if (r.ok) return r;
    // Se Emergent falhar (sem crédito etc.), cai para Pollinations gratuito.
    console.warn("⚠️ Emergent falhou, caindo para Pollinations gratuito:", r.error);
    const rp = await imagePollinations(faceSafeOpts);
    if (rp.ok) return rp;
    return { ok: false as const, error: r.error || "Emergent falhou", provider: "emergent" };
  }

  // auto: Pollinations é GRATUITO e sem chave — primário; demais como fallback.
  const r0 = await imagePollinations(faceSafeOpts);
  if (r0.ok) return r0;
  console.warn("⚠️ Pollinations falhou:", r0.error);
  if (LOVABLE_KEY) {
    const r = await imageLovable(faceSafeOpts);
    if (r.ok) return r;
    console.warn("⚠️ Lovable image falhou:", r.error);
  }
  if (GEMINI_KEY) {
    const r = await imageGemini(faceSafeOpts);
    if (r.ok) return r;
    console.warn("⚠️ Gemini direto falhou:", r.error);
  }
  if (EMERGENT_KEY) {
    const r = await imageEmergent(faceSafeOpts);
    if (r.ok) return r;
    console.warn("⚠️ Emergent image falhou:", r.error);
  }
  return { ok: false as const, error: "Nenhum provider de imagem disponível", provider: "none" };
}

