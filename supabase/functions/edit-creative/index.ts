import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { generateWithNanoBanana } from "../_shared/nano-banana.ts";

const REALISM =
  "high quality, sharp focus, natural lighting, realistic textures, balanced composition";
const NEGATIVE =
  "blurry, distorted, warped, melted faces, asymmetrical eyes, bad hands, deformed hands, abnormal hands, distorted hands, extra fingers, missing fingers, fused fingers, duplicated fingers, broken fingers, bent-backwards fingers, wrong thumb placement, claw hands, rubber fingers, displaced hands, mutated, " +
  "low quality, watermarks, fake text, garbled letters, broken layout";

const HAND_LOCK =
  "HAND LOCK: if any hand or fingers are visible, correct them to photorealistic anatomy before final output. Each visible hand must have exactly five fingers (one thumb plus four fingers), correct knuckles, natural nail placement, realistic palm structure, natural spacing/webbing, and a wrist aligned to the forearm. Preserve the original pose when possible, but fix extra fingers, missing fingers, fused fingers, duplicated fingertips, broken joints, claw-like fingers, rubbery fingers, wrong thumb placement, detached hands, or hands growing from the wrong place.";

function buildEditPrompt(userInstruction: string) {
  const instruction = (userInstruction || "").trim() ||
    "Polish and improve the visual quality of the image while keeping its composition.";
  return [
    "You will receive ONE reference image. Apply the requested modifications while preserving",
    "the original composition, subject identity, and overall layout unless the user explicitly",
    "asks to change them. Keep text legible and high-quality. Output a single edited image.",
    "",
    `USER MODIFICATIONS: ${instruction}`,
    "",
    HAND_LOCK,
    "",
    `STYLE: ${REALISM}.`,
    `Negative: ${NEGATIVE}.`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const image: string = String(body.image_base64 || body.image || "").trim();
    const prompt: string = String(body.prompt || body.instruction || "").trim();
    if (!image) {
      return new Response(JSON.stringify({ ok: false, error: "image_base64 obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prompt) {
      return new Response(JSON.stringify({ ok: false, error: "prompt obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl = image.startsWith("data:") ? image : `data:image/png;base64,${image}`;
    const fullPrompt = buildEditPrompt(prompt);
    const result = await generateWithNanoBanana({ prompt: fullPrompt, imageUrls: [imageUrl] });

    if (!result.url) {
      return new Response(JSON.stringify({ ok: false, error: result.error || "Sem imagem gerada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Local SVG fallback não edita de fato — devolve a imagem original.
    // Para edição, isso é considerado falha: o usuário precisa saber.
    if (result.provider === "local-fallback") {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "A IA de edição está indisponível no momento (Lovable AI, Gemini e Emergent falharam). " +
            "A imagem não foi alterada. Tente novamente em instantes.",
          provider: result.provider,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }



    return new Response(
      JSON.stringify({ ok: true, image: result.url, image_b64: result.url, provider: result.provider }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
