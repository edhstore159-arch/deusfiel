import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Diagnostic: tests EMERGENT_API_KEY against multiple known Emergent endpoints
// to figure out why image editing via Emergent is failing.

const ENDPOINTS = [
  "https://integrations.emergentagent.com/llm/chat/completions",
  "https://integrations.emergentagent.com/v1/chat/completions",
  "https://api.emergent.sh/v1/chat/completions",
  "https://llm.emergentagent.com/v1/chat/completions",
];

const MODELS = [
  "gemini-2.5-flash-image",
  "google/gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "google/gemini-3.1-flash-image-preview",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const key = Deno.env.get("EMERGENT_API_KEY") || "";
  const meta = {
    present: Boolean(key),
    length: key.length,
    prefix: key.slice(0, 4),
    suffix: key.slice(-4),
  };
  if (!key) {
    return new Response(JSON.stringify({ ok: false, meta, error: "EMERGENT_API_KEY ausente" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tinyPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const body = JSON.stringify({
    model: MODELS[0],
    modalities: ["image", "text"],
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Edit this 1x1 png: paint it solid red. Return an image." },
        { type: "image_url", image_url: { url: tinyPng } },
      ],
    }],
  });

  const results: any[] = [];
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body,
      });
      const txt = await r.text();
      results.push({ url, status: r.status, ok: r.ok, preview: txt.slice(0, 400) });
    } catch (e) {
      results.push({ url, error: String((e as Error)?.message || e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, meta, model: MODELS[0], results }, null, 2), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
