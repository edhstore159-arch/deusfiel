import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { generateImage } from '../_shared/llm.ts';
import { chatCompletion } from '../_shared/llm.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REALISM =
  "unedited RAW photograph straight out of camera, shot on Canon EOS R5 or Sony A7R IV full-frame sensor, 50mm or 85mm prime lens at f/1.8-f/2.2, ISO 200-400, 1/200s shutter, " +
  "photojournalism and documentary photography aesthetic in the style of Magnum Photos and National Geographic, candid real moment (NOT posed, NOT stock photo, NOT AI-looking), " +
  "16K hyper-detailed resolution with extreme micro-detail on skin: visible pores across the entire face, fine peach fuzz catching the light, subtle freckles, real moles, tiny skin imperfections, faint under-eye shadows, natural skin oiliness on the T-zone, light redness on cheeks and nose tip, fine expression lines where age-appropriate, " +
  "individual hair strands clearly separated with natural flyaways and stray hairs, eyebrow hairs individually visible with natural irregularity, lower lashes defined, light stubble where appropriate, " +
  "ultra-realistic eyes: detailed iris fiber patterns with radial striations and depth, dark limbal ring, wet glossy sclera with subtle red capillaries, sharp pinpoint catchlights that match the real light source position, natural tear line, soft eyelid shadow, subsurface scattering on the eyelid, " +
  "soft directional natural window light wrapping the face, realistic soft-edged shadows, subsurface scattering on ears, nose and fingers, balanced low-contrast color grading with accurate Brazilian skin tones, slight green-magenta tint of real ambient light, " +
  "authentic environment with real clutter, dust particles floating in light beams, fabric with real folds and weave texture, natural ISO grain preserved (NO denoising, NO smoothing, NO beauty filter), slight chromatic aberration at high-contrast edges, very subtle motion blur on moving parts, " +
  "imperfect candid framing with the subject slightly off-center, genuine micro-expressions, looks exactly like a real photo captured by a human photographer in a real place";

const NEG =
  "digital art, illustration, painting, cartoon, anime, 3d render, CGI, plastic skin, perfect skin, airbrushed, beauty filter, " +
  "stock photo aesthetic, AI-looking, uncanny valley, doll-like, mannequin, waxy skin, smooth skin, airbrushed skin, porcelain skin, baby skin, low-detail face, soft focus on face, oversaturated, exaggerated HDR, artificial studio lighting, overprocessed, " +
  "deformed face, distorted face, warped face, melted face, mutated face, disfigured face, ugly face, asymmetrical face, " +
  "asymmetrical eyes, crossed eyes, lazy eye, misaligned eyes, duplicated eyes, extra eyes, missing eye, distorted pupils, " +
  "deformed nose, crooked nose, double nose, deformed mouth, crooked mouth, extra mouth, missing mouth, bad teeth, extra teeth, missing teeth, fake smile, " +
  "deformed ears, extra ears, deformed jaw, deformed chin, extra heads, two heads, multiple faces, floating head, detached head, " +
  "deformed body, distorted anatomy, bad proportions, extra limbs, missing limbs, extra arms, extra legs, extra fingers, missing fingers, fused fingers, broken hands, deformed hands, " +
  "close-up only, face only, cropped body, blurry, low quality, watermark, logo, text, typography";

const FACE_LOCK =
  "FACE LOCK (CRITICAL — must be respected above all stylistic choices): render a single anatomically correct human face with symmetric, balanced and properly aligned features. " +
  "Exactly two eyes that are IDENTICAL in size, shape, height, width and tilt — perfectly symmetric on the horizontal axis, same eyelid opening, same iris diameter, same pupil size, both looking in exactly the same direction. Eye size must be anatomically correct relative to the face (roughly one eye-width between the two eyes, eye width approximately 1/5 of face width) — never oversized, never bulging, never one eye larger than the other, never asymmetric. Realistic pupils centered in the iris, detailed irises, natural eyelids and sharp catchlights. " +
  "One nose centered between the eyes with realistic nostrils. One mouth with natural lips and natural teeth alignment when visible. Two ears in correct position when visible. " +
  "Natural jawline and chin, balanced facial proportions, correct head-to-body ratio, one head per person, no duplicated, floating or detached features. " +
  "Realistic skin texture with pores and subtle imperfections, relaxed authentic expression, no warping, no melting, no smoothing that changes identity, no beautification filter. " +
  "If multiple people appear in the scene, every single one of them must independently respect this face lock. The composition must make visual sense — people, objects and environment coherently related, with correct scale, perspective and interaction. " +
  "EYE COMMUNICATION (CRITICAL): the eyes must look ALIVE and EXPRESSIVE — never blank, never glazed, never zombie-like, never dead-stare. " +
  "Both eyes must be fully open (not half-closed), with clearly defined and well-centered round pupils, vibrant irises showing natural color and depth, sharp catchlights reflecting the main light source, subtle moisture on the eye surface, and natural eyelid tension. " +
  "The gaze must have clear INTENT and DIRECTION — looking at the camera, at another person, or at an object in the scene — conveying a real human emotion consistent with the scene (attention, empathy, curiosity, determination, warmth, focus). " +
  "Micro-expressions around the eyes (slight brow movement, natural eyelid creases, subtle smile lines when appropriate) must reinforce the emotion. " +
  "Forbidden: empty stare, soulless eyes, glassy eyes, white/grey pupils, misaligned gaze, cross-eyed look, unfocused eyes, eyes pointing in different directions, dilated unnatural pupils, dead expression.";

// Reescreve o prompt do usuário em inglês descritivo, mantendo FIELMENTE o pedido.
async function elaboratePrompt(userPrompt: string, style?: string): Promise<string> {
  const userTheme = (userPrompt || "").trim();
  const extraContext = style === "law"
    ? "If — and only if — the user theme does not already specify a subject, you may set the scene in a modern Brazilian law-firm context. Never override or contradict the user's theme."
    : "";

  try {
    const r = await chatCompletion({
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: [
            "You are a director of photography and a specialist in hyper-realistic image prompts (Nano Banana style).",
            "Your task is to convert the user's scene description into ONE single-line English prompt that produces an EXTREMELY realistic photograph — as if captured by a professional DSLR camera, NOT digital art, NOT illustration, NOT 3D render.",
            "STRICT FIDELITY: Never change, replace, simplify or reinterpret the subject. Never invent elements not requested. Preserve ALL elements described by the user (people, objects, setting, mood, action). Translate non-English input to English while keeping exact meaning.",
            "ALWAYS FILL THESE FIELDS in the output prompt:",
            "- SCENE: describe the scene faithfully from the user theme.",
            "- CHARACTER: realistic appearance, natural skin imperfections, light stubble when appropriate, authentic emotional expression (concern, tiredness, reflection, joy — whatever fits). Never perfect or artificial faces. Brazilian appearance unless the user says otherwise.",
            `- FACE QUALITY: ${FACE_LOCK}`,
            "- ENVIRONMENT: real environment (simple home, office, street, etc.) with natural elements and imperfections (objects slightly out of place, real texture, light dust, wear).",
            "- LIGHTING: realistic cinematic lighting — soft natural window light, soft realistic shadows, balanced contrast, no exaggerated HDR.",
            "- CAMERA: 50mm or 85mm lens, shallow depth of field (slightly blurred background), focus on the face, DSLR photography style, natural ISO, no artificial noise.",
            "- STYLE: documentary photography, ultra realistic, natural colors (no oversaturation), no Instagram filter, no AI look.",
            "- DETAILS: real skin texture (pores, small imperfections), eyes with natural light reflections, real fabric folds, nothing plastic or CGI.",
            "FORBIDDEN: digital art, cartoon, 3D render, perfect skin, exaggerated artificial lighting, stock-photo aesthetic.",
            "GOAL: the image must look like a REAL photograph of a true, emotional, everyday situation.",
            "OUTPUT FORMAT: ONE single-line English prompt. No markdown, no bullet points, no explanations. End with: '--style raw --no artificial --no smooth skin --no CGI --photorealism high'.",
          ].join(" "),
        },
        {
          role: "user",
          content: `USER THEME (render this faithfully, do not replace it):\n"""${userTheme}"""\n\n${extraContext}`.trim(),
        },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 10) return txt;
    }
  } catch (_e) { /* fallback */ }

  return `${userTheme}. ${REALISM}. ${FACE_LOCK}. Negative: ${NEG}. --style raw --no artificial --no smooth skin --no CGI --photorealism high`;
}





Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, reference_image_base64, logo_base64, style } = body || {};
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPrompt = await elaboratePrompt(prompt, style);

    const toDataUrl = (b64: string) =>
      b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;

    // With reference image and/or logo: Gemini Nano Banana
    if (reference_image_base64 || logo_base64) {
      const imageUrls: string[] = [];
      const promptParts: string[] = [fullPrompt];

      if (reference_image_base64) {
        imageUrls.push(toDataUrl(reference_image_base64));
        promptParts.push("Use a primeira imagem enviada como referência visual principal. If it contains a person, preserve the face identity and proportions; never redraw, stretch, beautify, smooth, warp, or replace facial features.");
      }
      if (logo_base64) {
        imageUrls.push(toDataUrl(logo_base64));
        promptParts.push("Incorpore o logo enviado (última imagem) de forma discreta e elegante em um dos cantos da arte, preservando suas cores e proporções originais, sem distorcer.");
      }

      const result = await generateWithNanoBanana({
        prompt: promptParts.join("\n\n"),
        imageUrls,
      });

      if (!result.url) {
        return new Response(JSON.stringify({ error: result.error || "Sem imagem gerada" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ b64_json: stripDataUrl(result.url), image_data_url: result.url, provider: result.provider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text-to-image: try Lovable Gateway gpt-image-2, fallback to Emergent (gpt-image-1).
    const img = await generateImage({ prompt: fullPrompt, size: "1024x1024", quality: "high" });
    if (!img.ok) {
      // Local SVG fallback so the client never sees a 502 / blank screen.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><circle cx="512" cy="420" r="160" fill="rgba(255,255,255,0.08)"/><rect x="312" y="640" width="400" height="14" rx="7" fill="rgba(255,255,255,0.35)"/><rect x="372" y="680" width="280" height="10" rx="5" fill="rgba(255,255,255,0.22)"/></svg>`;
      const b64 = btoa(unescape(encodeURIComponent(svg)));
      return new Response(JSON.stringify({
        image_data_url: `data:image/svg+xml;base64,${b64}`,
        provider: "local-fallback",
        warning: img.error,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ b64_json: img.b64, image_data_url: `data:image/png;base64,${img.b64}`, provider: img.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
