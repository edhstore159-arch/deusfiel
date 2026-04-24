// Edge function: edit-image
// Recebe { imageUrls: string[], prompt: string, preset: string, count?: number,
//          replaceFaceUrl?: string, referenceUrl?: string }
// Chama Lovable AI Gateway com google/gemini-2.5-flash-image (modalities image+text)
// Faz upload do(s) resultado(s) no bucket debug-attachments e retorna URLs públicas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "debug-attachments";
const MAX_COUNT = 6;

const PRESET_INSTRUCTIONS: Record<string, string> = {
  "ig-post": "Saída final em proporção 1:1 (1080x1080), composição centrada, estilo Instagram Post.",
  "ig-story": "Saída final em proporção 9:16 (1080x1920), composição vertical, estilo Instagram Story/Reels.",
  "fb-post": "Saída final em proporção 1.91:1 (1200x630), horizontal, estilo Facebook Post.",
  "yt-thumb": "Saída final em 16:9 (1280x720), alto contraste, estilo Thumbnail YouTube.",
  "linkedin": "Saída final em 1.91:1 (1200x627), tom profissional, estilo LinkedIn.",
  "bg-remove": "Remova completamente o fundo da imagem; resultado deve ser PNG transparente isolando o sujeito.",
  "bg-replace": "Substitua o fundo conforme a descrição do usuário; mantenha o sujeito principal exatamente como está.",
  "enhance": "Melhore qualidade: nitidez, balanço de cores, iluminação. Mantenha a composição original.",
  "clone-post": "RECRIE este post de rede social IDENTICAMENTE: mesma composição, enquadramento, iluminação, cores, tipografia, layout, textos, logos e estilo geral. A ÚNICA mudança permitida é substituir a pessoa/rosto principal pela pessoa da imagem de referência fornecida (mantendo pose, ângulo, expressão e roupa o mais próximo possível do post original). Preserve todos os outros detalhes ao máximo.",
  "face-swap": "Use the FIRST image as the base composition, lighting, and environment. Replace the subject/person in it with the person from the SECOND image. Keep the original pose, camera angle, framing, lighting, shadows, reflections, background and depth of field. Match skin tone and color grading naturally. Seamless realistic integration: no distortions, no artifacts, correct proportions. Ultra realistic, high detail, sharp focus, 8k.",
  "face-swap-cinematic": "Use the FIRST image as cinematic base. Replace the subject with the person from the SECOND image. Film lighting, dramatic shadows, volumetric light, depth of field, anamorphic lens. Hyper-realistic movie still with Hollywood color grading. Keep pose, framing and environment intact.",
  "face-swap-fusion": "Fuse both uploaded images: structure and environment from IMAGE 1, identity from IMAGE 2. AI reconstruction with neural blending and ultra-detailed textures. Perfect face integration, realistic lighting adaptation, no artifacts.",
  "face-swap-photo": "Use the FIRST image as a professional photo setup. Replace the subject with the person from the SECOND image. Studio lighting, realistic skin, natural shadows, 85mm lens, f/1.8, DSLR quality, ultra realistic.",
  "face-swap-art": "Transform the FIRST image into a stylized artwork while replacing the subject with the person from the SECOND image. Digital painting, soft brush, dramatic light, semi-realistic, expressive, high detail.",
  "face-swap-social": "Perfect face replacement using IMAGE 1 as base scene and IMAGE 2 as the person. Same pose, same lighting, same framing. Clean skin, natural look, influencer quality. Ultra realistic, no distortions.",
  "free": "",
};

// Tenta extrair a imagem principal de uma URL de post (Instagram, etc)
// usando a meta tag og:image. Funciona para muitos casos públicos.
async function resolveSocialPostImage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableBot/1.0; +https://lovable.dev)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const html = await res.text();
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) return m[1].replace(/&amp;/g, "&");
    }
    throw new Error("og:image não encontrado");
  } catch (e) {
    throw new Error(`Não consegui extrair imagem do post: ${e instanceof Error ? e.message : e}`);
  }
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

type GenResult = { dataUrl?: string; text?: string; error?: string; status?: number; provider?: string };

async function fetchUrlAsDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar imagem (${res.status}): ${url}`);
  const ct = res.headers.get("content-type") || "image/png";
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return `data:${ct};base64,${btoa(bin)}`;
}

async function generateLovable(opts: { apiKey: string; imageUrls: string[]; prompt: string; variantHint?: string }): Promise<GenResult> {
  const content: Array<Record<string, unknown>> = [
    { type: "text", text: opts.prompt + (opts.variantHint ? `\n\n${opts.variantHint}` : "") },
  ];
  for (const url of opts.imageUrls) content.push({ type: "image_url", image_url: { url } });

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  if (!aiRes.ok) return { error: await aiRes.text(), status: aiRes.status, provider: "lovable" };
  const aiData = await aiRes.json();
  const dataUrl: string | undefined = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const textResp: string | undefined = aiData?.choices?.[0]?.message?.content;
  return { dataUrl, text: textResp, provider: "lovable" };
}

async function generateOpenAI(opts: { apiKey: string; imageUrls: string[]; prompt: string; variantHint?: string }): Promise<GenResult> {
  const fullPrompt = opts.prompt + (opts.variantHint ? `\n\n${opts.variantHint}` : "");
  try {
    if (opts.imageUrls.length > 0) {
      // Edição: usa /v1/images/edits com gpt-image-1 (multipart)
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", fullPrompt);
      form.append("size", "1024x1024");
      for (let i = 0; i < opts.imageUrls.length; i++) {
        const dUrl = await fetchUrlAsDataUrl(opts.imageUrls[i]);
        const m = dUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) continue;
        const mime = m[1]; const b64 = m[2];
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const ext = (mime.split("/")[1] || "png").split("+")[0];
        form.append("image[]", new Blob([bytes], { type: mime }), `img-${i}.${ext}`);
      }
      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiKey}` },
        body: form,
      });
      if (!res.ok) return { error: await res.text(), status: res.status, provider: "openai" };
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) return { error: "OpenAI não retornou imagem", provider: "openai" };
      return { dataUrl: `data:image/png;base64,${b64}`, provider: "openai" };
    } else {
      // Geração pura
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt: fullPrompt, size: "1024x1024" }),
      });
      if (!res.ok) return { error: await res.text(), status: res.status, provider: "openai" };
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) return { error: "OpenAI não retornou imagem", provider: "openai" };
      return { dataUrl: `data:image/png;base64,${b64}`, provider: "openai" };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), provider: "openai" };
  }
}

async function generateEmergent(opts: { apiKey: string; imageUrls: string[]; prompt: string; variantHint?: string }): Promise<GenResult> {
  // Emergent expõe um gateway compatível com OpenAI Chat Completions (modalities image+text)
  const fullPrompt = opts.prompt + (opts.variantHint ? `\n\n${opts.variantHint}` : "");
  const content: Array<Record<string, unknown>> = [{ type: "text", text: fullPrompt }];
  for (const url of opts.imageUrls) content.push({ type: "image_url", image_url: { url } });
  try {
    const res = await fetch("https://integrations.emergentagent.com/llm/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.0-flash-exp-image-generation",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return { error: await res.text(), status: res.status, provider: "emergent" };
    const data = await res.json();
    const dataUrl: string | undefined =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      (data?.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : undefined);
    if (!dataUrl) return { error: "Emergent não retornou imagem", provider: "emergent" };
    return { dataUrl, provider: "emergent" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), provider: "emergent" };
  }
}

async function generateOne(opts: {
  lovableKey?: string;
  openaiKey?: string;
  emergentKey?: string;
  imageUrls: string[];
  prompt: string;
  variantHint?: string;
}): Promise<GenResult> {
  const attempts: string[] = [];

  // 1) Lovable AI
  if (opts.lovableKey) {
    const r = await generateLovable({ apiKey: opts.lovableKey, imageUrls: opts.imageUrls, prompt: opts.prompt, variantHint: opts.variantHint });
    if (r.dataUrl) return r;
    attempts.push(`lovable[${r.status ?? "?"}]: ${(r.error || "").slice(0, 200)}`);
    // Em 429 (rate limit) deixa o caller fazer retry; em outros, segue para fallback
    if (r.status === 429) return { ...r, error: attempts.join(" | ") };
  }

  // 2) OpenAI
  if (opts.openaiKey) {
    const r = await generateOpenAI({ apiKey: opts.openaiKey, imageUrls: opts.imageUrls, prompt: opts.prompt, variantHint: opts.variantHint });
    if (r.dataUrl) return r;
    attempts.push(`openai[${r.status ?? "?"}]: ${(r.error || "").slice(0, 200)}`);
  }

  // 3) Emergent
  if (opts.emergentKey) {
    const r = await generateEmergent({ apiKey: opts.emergentKey, imageUrls: opts.imageUrls, prompt: opts.prompt, variantHint: opts.variantHint });
    if (r.dataUrl) return r;
    attempts.push(`emergent[${r.status ?? "?"}]: ${(r.error || "").slice(0, 200)}`);
  }

  return { error: attempts.join(" || ") || "Nenhum provedor configurado" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || undefined;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || undefined;
    const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY") || undefined;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env ausente");

    const body = await req.json().catch(() => ({}));
    const {
      imageUrls = [],
      prompt = "",
      preset = "free",
      count = 1,
      replaceFaceUrl,
      referenceUrl,
      userLovableKey,
      userOpenaiKey,
    } = body as {
      imageUrls?: string[];
      prompt?: string;
      preset?: string;
      count?: number;
      replaceFaceUrl?: string;
      referenceUrl?: string;
      userLovableKey?: string;
      userOpenaiKey?: string;
    };

    // Chaves do usuário têm prioridade (ele paga sua própria conta).
    const lovableKey = (userLovableKey && userLovableKey.trim()) || LOVABLE_API_KEY;
    const openaiKey = (userOpenaiKey && userOpenaiKey.trim()) || OPENAI_API_KEY;
    if (!lovableKey && !openaiKey && !EMERGENT_API_KEY) {
      throw new Error("Nenhum provedor configurado. Configure suas chaves no popup de debug ou contate o admin.");
    }

    const resolvedImageUrls: string[] = [...imageUrls];
    let referenceNote = "";
    if (referenceUrl && isHttpUrl(referenceUrl)) {
      const resolved = await resolveSocialPostImage(referenceUrl);
      resolvedImageUrls.unshift(resolved);
      referenceNote = `\n\n[Imagem 1 = post de referência extraído de: ${referenceUrl}]`;
    }

    if (replaceFaceUrl && isHttpUrl(replaceFaceUrl)) {
      resolvedImageUrls.push(replaceFaceUrl);
      referenceNote += `\n[Última imagem = pessoa/rosto que deve substituir a pessoa principal do post]`;
    }

    if (resolvedImageUrls.length === 0 && !prompt?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "Forneça imageUrls, referenceUrl ou um prompt" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const presetText = PRESET_INSTRUCTIONS[preset] ?? "";

    const isFaceSwap = preset.startsWith("face-swap") || preset === "clone-post";
    let imageAnnotation = "";
    if (isFaceSwap && resolvedImageUrls.length >= 2) {
      imageAnnotation = `[IMAGE 1 = base scene/composition. IMAGE 2 = person whose face/identity must replace the subject in IMAGE 1. Keep IMAGE 1's pose, lighting, framing and background; only swap the person.]`;
    }

    const baseUserPrompt = [presetText, prompt?.trim() || "", referenceNote, imageAnnotation]
      .filter(Boolean).join("\n\n") || "Edite a imagem mantendo o estilo original.";

    const n = Math.max(1, Math.min(MAX_COUNT, Number(count) || 1));
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results: GenResult[] = [];
    let hitNoCredits = false;
    let hitRateLimit = false;
    for (let i = 0; i < n; i++) {
      let attempt = 0;
      let r: GenResult | null = null;
      while (attempt < 3) {
        r = await generateOne({
          lovableKey,
          openaiKey,
          emergentKey: EMERGENT_API_KEY,
          imageUrls: resolvedImageUrls,
          prompt: baseUserPrompt,
          variantHint: n > 1 ? `Variação ${i + 1} de ${n}: produza uma versão ligeiramente diferente mas coerente com a instrução.` : undefined,
        });
        if (!r.dataUrl && r.status === 429 && attempt < 2) {
          await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
          attempt++;
          continue;
        }
        break;
      }
      if (r) {
        if (r.status === 402) hitNoCredits = true;
        if (r.status === 429) hitRateLimit = true;
        results.push(r);
      }
      if (i < n - 1) await new Promise((res) => setTimeout(res, 600));
    }

    if (hitNoCredits && results.every((r) => !r.dataUrl)) {
      return new Response(JSON.stringify({ ok: false, error: "Créditos insuficientes em todos os provedores. Verifique sua conta OpenAI/Emergent ou adicione créditos em Settings > Workspace > Usage." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (hitRateLimit && results.every((r) => !r.dataUrl)) {
      return new Response(JSON.stringify({ ok: false, error: "Limite de requisições atingido em todos os provedores. Aguarde alguns instantes." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urls: string[] = [];
    const errors: string[] = [];
    const providers: string[] = [];

    for (const r of results) {
      if (!r.dataUrl) {
        errors.push(r.error || r.text || "Modelo não retornou imagem");
        continue;
      }
      const match = r.dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
      if (!match) { errors.push("Formato de data URL inválido"); continue; }
      const mime = match[1];
      const ext = mime.split("/")[1].split("+")[0] || "png";
      const base64 = match[2];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const path = `edited/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });
      if (upErr) { errors.push(`Upload falhou: ${upErr.message}`); continue; }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urls.push(pub.publicUrl);
      if (r.provider) providers.push(r.provider);
    }

    if (urls.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: errors[0] || "Nenhuma imagem gerada", details: errors }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, urls, url: urls[0], errors, providers, prompt: baseUserPrompt, count: urls.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("edit-image error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

