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

async function generateOne(opts: {
  apiKey: string;
  imageUrls: string[];
  prompt: string;
  variantHint?: string;
}): Promise<{ dataUrl?: string; text?: string; error?: string; status?: number }> {
  const content: Array<Record<string, unknown>> = [
    { type: "text", text: opts.prompt + (opts.variantHint ? `\n\n${opts.variantHint}` : "") },
  ];
  for (const url of opts.imageUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return { error: errText, status: aiRes.status };
  }
  const aiData = await aiRes.json();
  const dataUrl: string | undefined = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const textResp: string | undefined = aiData?.choices?.[0]?.message?.content;
  return { dataUrl, text: textResp };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env ausente");

    const body = await req.json().catch(() => ({}));
    const {
      imageUrls = [],
      prompt = "",
      preset = "free",
      count = 1,
      replaceFaceUrl,
      referenceUrl,
    } = body as {
      imageUrls?: string[];
      prompt?: string;
      preset?: string;
      count?: number;
      replaceFaceUrl?: string;
      referenceUrl?: string;
    };

    // Resolve referenceUrl (post de IG/etc) → imagem direta via og:image
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

    if (resolvedImageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "Forneça imageUrls ou referenceUrl" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Gera N variações em paralelo
    const tasks = Array.from({ length: n }).map((_, i) =>
      generateOne({
        apiKey: LOVABLE_API_KEY,
        imageUrls: resolvedImageUrls,
        prompt: baseUserPrompt,
        variantHint: n > 1 ? `Variação ${i + 1} de ${n}: produza uma versão ligeiramente diferente mas coerente com a instrução.` : undefined,
      })
    );
    const results = await Promise.all(tasks);

    // Trata rate limit / créditos coletivamente
    const rateLimited = results.find((r) => r.status === 429);
    if (rateLimited) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const noCredits = results.find((r) => r.status === 402);
    if (noCredits) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes na Lovable AI. Adicione créditos em Settings > Workspace > Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urls: string[] = [];
    const errors: string[] = [];

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
    }

    if (urls.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma imagem gerada", details: errors }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ urls, url: urls[0], errors, prompt: baseUserPrompt, count: urls.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("edit-image error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
