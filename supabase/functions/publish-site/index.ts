import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "sites-publicados";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const html = String(body.html || "");
    if (!html || html.length < 50) {
      return new Response(JSON.stringify({ error: "HTML vazio ou inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: buckets } = await client.storage.listBuckets();
    if (!buckets?.some((b) => b.id === BUCKET)) {
      await client.storage.createBucket(BUCKET, { public: true, allowedMimeTypes: ["text/html"] });
    }

    const raw = String(body.name || "meu-site").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40) || "meu-site";
    const slug = `${raw}-${Date.now().toString(36)}`;
    const path = `${slug}/index.html`;

    const { error: upErr } = await client.storage.from(BUCKET).upload(path, new Blob([html], { type: "text/html" }), {
      contentType: "text/html",
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      return new Response(JSON.stringify({ error: `Falha ao publicar: ${upErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    return new Response(JSON.stringify({ url, path: `${BUCKET}/${path}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});