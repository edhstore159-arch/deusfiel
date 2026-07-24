// Lovable Cloud Function: generate-image
// Generates images using DALL-E 3 via OpenAI API
// Recovers the old image generation prompts for church banners

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Old prompts recovered - church banner generation templates
const BANNER_PROMPTS: Record<string, string> = {
  "cultos-ao-vivo": `Generate a professional church live stream banner. Warm golden lighting, 
    modern church interior with wooden pews, cross on stage, soft bokeh lights in background. 
    Text overlay area on left side. Style: cinematic, warm tones, 1920x1080 aspect ratio. 
    Mood: welcoming, spiritual, contemporary worship atmosphere.`,

  "ministerio-infantil": `Generate a colorful children's ministry banner. Happy diverse children 
    playing in a bright, safe church classroom. Primary colors (red, blue, yellow, green), 
    toys, books, and a gentle cross motif. Style: cheerful, vibrant, photorealistic. 
    Mood: joyful, safe, educational. 1920x1080 aspect ratio.`,

  "ministerio-de-casais": `Generate an elegant couples ministry banner. Romantic but tasteful 
    image of a couple holding hands walking in a garden at golden hour. Soft focus background 
    with flowers and warm sunlight. Style: romantic, elegant, warm tones. 
    Mood: love, commitment, faith partnership. 1920x1080 aspect ratio.`,

  "missoes": `Generate a missions ministry banner. Diverse group of people from different 
    cultures coming together in prayer. African landscape background with sunset. 
    Style: documentary, heartfelt, warm earth tones. 
    Mood: unity, purpose, global mission. 1920x1080 aspect ratio.`,

  "secretaria": `Generate a professional church secretariat/administration banner. Clean, 
    organized office space with warm wooden desk, Bible, flowers, and soft natural light. 
    Style: professional, welcoming, organized. 
    Mood: efficiency, care, faithful service. 1920x1080 aspect ratio.`,

  "default": `Generate a beautiful church banner with a warm, welcoming atmosphere. 
    Modern church building or sanctuary with golden hour lighting, soft clouds, 
    and a sense of peace and community. Style: cinematic, warm, inviting. 
    1920x1080 aspect ratio.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { ministrySlug, customPrompt, size = "1792x1024" } = body;

    const prompt = customPrompt || BANNER_PROMPTS[ministrySlug] || BANNER_PROMPTS.default;

    const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality: "hd",
        response_format: "url",
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(
        JSON.stringify({ error: "Image generation failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiRes.json();
    const imageUrl = aiJson?.data?.[0]?.url;
    const revisedPrompt = aiJson?.data?.[0]?.revised_prompt;

    return new Response(
      JSON.stringify({
        url: imageUrl,
        prompt: revisedPrompt || prompt,
        ministry: ministrySlug || "custom",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
