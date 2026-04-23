// Edge function: edit-image
// Recebe { imageUrls: string[], prompt: string, preset: string }
// Chama Lovable AI Gateway com google/gemini-2.5-flash-image (modalities image+text)
// Faz upload do resultado no bucket debug-attachments e retorna a URL pública.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "debug-attachments";

const PRESET_INSTRUCTIONS: Record<string, string> = {
  "ig-post": "Saída final em proporção 1:1 (1080x1080), composição centrada, estilo Instagram Post.",
  "ig-story": "Saída final em proporção 9:16 (1080x1920), composição vertical, estilo Instagram Story/Reels.",
  "fb-post": "Saída final em proporção 1.91:1 (1200x630), horizontal, estilo Facebook Post.",
  "yt-thumb": "Saída final em 16:9 (1280x720), alto contraste, estilo Thumbnail YouTube.",
  "linkedin": "Saída final em 1.91:1 (1200x627), tom profissional, estilo LinkedIn.",
  "bg-remove": "Remova completamente o fundo da imagem; resultado deve ser PNG transparente isolando o sujeito.",
  "bg-replace": "Substitua o fundo conforme a descrição do usuário; mantenha o sujeito principal exatamente como está.",
  "enhance": "Melhore qualidade: nitidez, balanço de cores, iluminação. Mantenha a composição original.",
  "free": "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env ausente");

    const body = await req.json().catch(() => ({}));
    const { imageUrls, prompt, preset } = body as {
      imageUrls?: string[];
      prompt?: string;
      preset?: string;
    };

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "imageUrls é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const presetText = PRESET_INSTRUCTIONS[preset || "free"] ?? "";
    const userPrompt = [
      presetText,
      prompt?.trim() || "",
    ].filter(Boolean).join("\n\n") || "Edite a imagem mantendo o estilo original.";

    const content: Array<Record<string, unknown>> = [{ type: "text", text: userPrompt }];
    for (const url of imageUrls) {
      content.push({ type: "image_url", image_url: { url } });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes na Lovable AI. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway falhou (${aiRes.status}): ${errText}`);
    }

    const aiData = await aiRes.json();
    const dataUrl: string | undefined = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResp: string | undefined = aiData?.choices?.[0]?.message?.content;

    if (!dataUrl) {
      return new Response(JSON.stringify({ error: "Modelo não retornou imagem", details: textResp }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // dataUrl: "data:image/png;base64,xxxx"
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (!match) throw new Error("Formato de data URL inválido");
    const mime = match[1];
    const ext = mime.split("/")[1].split("+")[0] || "png";
    const base64 = match[2];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const path = `edited/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) throw new Error(`Upload falhou: ${upErr.message}`);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return new Response(
      JSON.stringify({ url: pub.publicUrl, mime, prompt: userPrompt }),
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
