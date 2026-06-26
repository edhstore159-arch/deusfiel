import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { generateImage, hasHumanSubject, hasHybridRequest } from '../_shared/llm.ts';
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
  "asymmetrical eyes, different sized eyes, one eye bigger than the other, oversized eyes, bulging eyes, googly eyes, anime eyes, huge pupils, crossed eyes, lazy eye, misaligned eyes, duplicated eyes, extra eyes, missing eye, distorted pupils, uneven eyelids, " +
  "deformed nose, crooked nose, double nose, deformed mouth, crooked mouth, extra mouth, missing mouth, bad teeth, extra teeth, missing teeth, fake smile, " +
  "deformed ears, extra ears, deformed jaw, deformed chin, extra heads, two heads, multiple faces, floating head, detached head, " +
  "deformed body, distorted anatomy, bad proportions, extra limbs, missing limbs, extra arms, extra legs, extra fingers, missing fingers, fused fingers, broken hands, deformed hands, " +
  "bad hands, abnormal hands, malformed hands, mutated hands, distorted hands, ugly hands, duplicated fingers, duplicate fingertips, extra nails, missing nails, webbed fingers, broken fingers, bent-backwards fingers, claw hands, rubber fingers, sausage fingers, baguette fingers, long unnatural fingers, tiny hands, oversized hands, wrong thumb placement, detached hands, floating hands, hands growing from wrong place, twisted wrists, broken wrists, " +
  "unrequested visible hands, unnecessary visible fingers, close-up hands, hand gesture when not requested, " +
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

const ANATOMY_LOCK =
  "ANATOMY LOCK (CRITICAL — must be respected above stylistic choices): render an anatomically correct human body with perfectly natural proportions and joint placement. " +
  "Exactly two arms attached at the shoulders, two legs attached at the hips, one head attached to the neck, hands with exactly five fingers each (one thumb + four fingers, correct length and natural curl), feet with five toes each. " +
  "All limbs must be PROPERLY CONNECTED to the torso at anatomically correct joints — shoulders, elbows, wrists, hips, knees and ankles in their natural positions, never floating, never detached, never displaced, never duplicated, never fused, never twisted backwards, never bending in impossible directions. " +
  "Correct bone structure, correct muscle mass, correct skeletal alignment, spine in natural posture, shoulders level, hips level, symmetric limb length (left arm same length as right arm, left leg same length as right leg). " +
  "Hands and fingers must look REAL: natural finger spacing, correct knuckles, visible nails, natural grip and gesture — NO extra fingers, NO missing fingers, NO fused fingers, NO bent-the-wrong-way joints, NO mutated hands, NO claw hands. " +
  "If the person is sitting, standing, walking or interacting with an object, the pose must be physically plausible and biomechanically correct — center of gravity makes sense, contact points match, clothing folds follow the body underneath. " +
  "If multiple people appear, every single one of them must independently respect this anatomy lock and their bodies must not merge, overlap incorrectly or share limbs.";

const HAND_LOCK =
  "HAND LOCK (CRITICAL — inspect and correct every visible hand before final output): every visible hand must be photorealistic, anatomically normal and proportional to the person's body. " +
  "Each hand has exactly five fingers: one opposable thumb and four fingers, with correct knuckle count, natural nail placement, realistic palm structure, natural webbing between fingers, and believable skin folds. " +
  "Finger lengths must be natural (middle longest, ring/index slightly shorter, pinky shortest, thumb lower and angled), with no duplicate fingertips, no extra nails, no fused fingers, no missing fingers, no claw-like fingers, no rubbery fingers, no broken joints and no fingers bending backward. " +
  "Hands must be attached correctly at the wrist, wrists must align with forearms, and gestures must be physically possible for the scene: relaxed resting hands, natural grip, or coherent pointing/holding only when requested. " +
  "If hands are partially hidden by clothing, objects, crop, or another person, keep the visible parts plausible and avoid inventing extra fingers. " +
  "For group scenes, apply this hand check independently to every person; no shared hands, no merged hands, no hand growing from another body part, no displaced hands.";

// Estratégia preventiva: evitar mostrar mãos quando não forem essenciais ao pedido.
// IA de imagem ainda erra anatomia das mãos com frequência — esconder reduz drasticamente artefatos.
const HAND_AVOIDANCE =
  "HAND AVOIDANCE STRATEGY (apply whenever the user prompt does NOT explicitly require visible hands or a hand gesture): " +
  "compose the framing to keep hands COMPLETELY out of view or naturally concealed. Prefer one of these solutions: " +
  "(1) crop the frame above the wrists as a chest-up portrait, medium close-up or head-and-shoulders shot; " +
  "(2) place hands inside pockets, behind the back, under a desk, inside long sleeves, or holding a coherent object that hides the fingers (folder, mug, phone seen from behind, book against the chest); " +
  "(3) angle the body so hands fall outside the frame or are occluded by furniture, clothing or other people. " +
  "Do not show loose fingers at the bottom or edges of the image. Only render fully visible hands when the user explicitly asked for a gesture, a handshake, holding something specific, or when the hands are the subject. " +
  "If hands MUST appear, show them relaxed, at rest, partially occluded, and never in extreme close-up. Never invent gesturing hands that were not requested.";

const HANDS_ARE_REQUESTED = /\b(hand|hands|finger|fingers|thumb|gesture|handshake|waving|pointing|holding|grabbing|clapping|typing|writing|m[aã]o|m[aã]os|dedo|dedos|polegar|gesto|aperto de m[aã]o|acenando|apontando|segurando|digitando|escrevendo)\b/i;

const FRUIT_OR_OBJECT = /\b(fruit|apple|maçã|maca|macan|banana|laranja|orange|uva|grape|morango|strawberry|abacaxi|pineapple|melancia|watermelon|mam[ãa]o|papaya|pera|pear|manga|mango|lim[ãa]o|lemon|p[êe]ssego|peach|cereja|cherry|kiwi|fruta|objeto|produto|product|object|food|comida|bolo|p[ãa]o|baguete|book|livro|carro|casa|flor)\b/i;

const OBJECT_LOCK =
  "NON-HUMAN OBJECT LOCK (CRITICAL): render only the requested fruit, food, product, object, animal, landscape or scene. Do not add people, faces, eyes, mouths, arms, hands, fingers, skin, fingernails, limbs, body parts, portraits, or anthropomorphic traits. The requested object must be standalone with a clean silhouette, correct natural shape, realistic material texture, and must never merge with human anatomy. No person holding it unless the user explicitly asked for a person/hand holding it.";

function handCompositionGuard(userPrompt = "") {
  if (HANDS_ARE_REQUESTED.test(userPrompt)) {
    return "VISIBLE HANDS WERE REQUESTED: show hands only as necessary, never close-up unless requested, and run a strict final anatomy check: exactly five fingers per hand, natural thumb placement, natural knuckles, realistic nails, correct wrist connection, no extra/missing/fused fingers.";
  }
  return "NO HANDS REQUESTED: the final image must use a chest-up, head-and-shoulders, or above-the-wrist crop. Hands and fingers must not be visible anywhere, including image edges and foreground. Hide them behind the frame, pockets, sleeves, desk, folder, book, or body. Do not invent hands or gestures.";
}


// Reescreve o prompt do usuário em inglês descritivo, mantendo FIELMENTE o pedido.
async function elaboratePrompt(userPrompt: string, style?: string): Promise<string> {
  const userTheme = (userPrompt || "").trim();
  const humanSubject = hasHumanSubject(userTheme);
  const objectSubject = !humanSubject || FRUIT_OR_OBJECT.test(userTheme);

  if (objectSubject && !humanSubject) {
    return [
      `Faithful photorealistic rendering of: ${userTheme}.`,
      OBJECT_LOCK,
      "Use product/documentary photography, natural light, sharp focus, coherent scale and perspective, realistic textures, clean separation between the subject and background.",
      "If the subject is fruit or food: whole intact item, natural organic shape, realistic peel/skin texture, no deformation, no bite/cut unless requested.",
      "Negative: human, person, face, eyes, mouth, hands, fingers, arms, legs, skin, fingernails, portrait, anthropomorphic, hybrid, object fused with hand, fruit fused with fingers, melted, warped, duplicated parts, cartoon, CGI, illustration, text, watermark, logo.",
      "--style raw --photorealism high --no human --no hands --no fingers --no face --no body_parts --no object_anatomy_fusion",
    ].join(" ");
  }

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
            `- HAND QUALITY: ${HAND_LOCK}`,
            `- HAND FRAMING: ${HAND_AVOIDANCE}`,
            "DEFAULT HAND RULE: when hands are not explicitly requested by the user theme, do not render hands or fingers at all. Use a chest-up crop above the wrists.",
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

    const userElaborated = await elaboratePrompt(prompt, style);
    const humanSubject = hasHumanSubject(prompt);
    const handGuard = handCompositionGuard(prompt);
    const fullPrompt = humanSubject ? [
      userElaborated,
      "",
      `REALISM REQUIREMENTS: ${REALISM}`,
      "",
      FACE_LOCK,
      "",
      ANATOMY_LOCK,
      "",
      handGuard,
      "",
      HAND_LOCK,
      "",
      HAND_AVOIDANCE,
      "",
      `Negative prompt: ${NEG}, visible hands when not requested, visible fingers when not requested, bad hands, abnormal hands, deformed hands, distorted hands, malformed hands, mutated hands, extra fingers, missing fingers, fused fingers, webbed fingers, duplicated fingers, duplicate fingertips, extra nails, missing nails, broken fingers, bent-backwards fingers, claw hands, rubber fingers, long unnatural fingers, tiny hands, oversized hands, wrong thumb placement, detached hands, floating hands, hands growing from wrong place, baguette fingers, sausage fingers, displaced limbs, dislocated limbs, detached arms, detached legs, floating limbs, limbs in wrong place, arms attached to wrong body part, legs attached to wrong body part, twisted limbs, broken limbs, disjointed limbs, extra joints, missing joints, impossible pose, biomechanically wrong, body parts merging, limbs growing from torso, limbs growing from head, dismembered, mangled body`,
      "--style raw --no artificial --no smooth skin --no CGI --photorealism high --no visible_hands --no visible_fingers --no bad_hands --no deformed_hands --no extra_fingers --no missing_fingers --no fused_fingers --no displaced_limbs --no dislocated_limbs --no extra_limbs --no missing_limbs",
    ].join("\n") : [
      userElaborated,
      "",
      OBJECT_LOCK,
      "",
      "Photorealistic non-human subject, faithful to the user's request, realistic material, correct natural form, clean silhouette, no anatomy, no portrait, no skin, no hands, no fingers, no face, no person, no human body parts.",
      "Negative prompt: person, people, human, face, portrait, eyes, mouth, skin, arm, hand, finger, nails, limb, body, body parts, holding, human-object hybrid, fruit-human hybrid, object fused with hand, fruit fused with fingers, anthropomorphic, mutated, melted, warped, deformed, duplicated parts, CGI, cartoon, illustration, text, watermark, logo.",
      "--style raw --photorealism high --no human --no face --no hands --no fingers --no skin --no body_parts --no anthropomorphic --no object_anatomy_fusion",
    ].join("\n");


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
