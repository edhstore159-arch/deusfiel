// Enhance an image via a two-step pipeline:
// 1) Refine the user's goal into a detailed image-edit prompt using a text LLM
//    (Gemini via Lovable AI Gateway; fallback to GPT / Claude if available).
// 2) Run Nano Banana (google/gemini-2.5-flash-image) with the refined prompt
//    and the source image to produce an enhanced image.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { generateWithNanoBanana } from "../_shared/nano-banana.ts";

const LOVABLE = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function refinePrompt(goal: string, hasImage: boolean): Promise<{ prompt: string; refiner: string; error?: string }> {
  const sys =
    "You rewrite short user requests into precise photo-enhancement prompts for an image-edit model. " +
    "Preserve identity, faces and composition of the reference image. Improve lighting, sharpness, color, skin, noise, and framing. Output ONLY the prompt, no preamble.";
  const user = hasImage
    ? `User goal: ${goal || "make this photo look professional and hyperreal"}\nWrite the enhancement prompt.`
    : `User goal: ${goal}\nWrite a hyperreal photo prompt.`;

  const lovable = Deno.env.get("LOVABLE_API_KEY");
  if (lovable) {
    for (const model of ["google/gemini-2.5-flash", "openai/gpt-5-mini", "openai/gpt-5.5"]) {
      try {
        const r = await fetch(LOVABLE, {
          method: "POST",
          headers: { "Lovable-API-Key": lovable, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }),
        });
        if (!r.ok) continue;
        const d = await r.json();
        const txt = d?.choices?.[0]?.message?.content?.trim();
        if (txt) return { prompt: txt, refiner: model };
      } catch { /* try next */ }
    }
  }

  // Claude direct (if ANTHROPIC_API_KEY is set)
  const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropic) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anthropic, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 400, system: sys, messages: [{ role: "user", content: user }] }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d?.content?.[0]?.text?.trim();
        if (txt) return { prompt: txt, refiner: "claude-3-5-sonnet" };
      }
    } catch { /* ignore */ }
  }

  // Fallback: usa o próprio goal como prompt.
  return { prompt: goal || "Enhance this photo: improve lighting, sharpness, skin, color, noise. Keep identity and composition.", refiner: "fallback:none", error: "nenhum refinador disponível" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const goal: string = String(body?.goal || body?.prompt || "").slice(0, 2000);
    const imageUrl: string | undefined = body?.imageUrl || body?.image_url;
    if (!imageUrl && !goal) {
      return new Response(JSON.stringify({ ok: false, error: "Envie 'imageUrl' (data URL ou https) e/ou 'goal'." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refined = await refinePrompt(goal, Boolean(imageUrl));
    const nano = await generateWithNanoBanana({
      prompt: refined.prompt,
      imageUrls: imageUrl ? [imageUrl] : [],
      mode: imageUrl ? "edit" : "generate",
    });

    if (!nano?.url) {
      return new Response(JSON.stringify({ ok: false, refiner: refined.refiner, refined_prompt: refined.prompt, error: nano?.error || "Nano Banana falhou" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, refiner: refined.refiner, refined_prompt: refined.prompt, provider: nano.provider, imageUrl: nano.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error)?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
