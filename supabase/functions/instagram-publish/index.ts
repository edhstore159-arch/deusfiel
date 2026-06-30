// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function waitContainerReady(igUserId: string, containerId: string, token: string) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
    const j = await r.json();
    if (j.status_code === "FINISHED") return true;
    if (j.status_code === "ERROR") throw new Error("container error: " + JSON.stringify(j));
    await new Promise((res) => setTimeout(res, 1500));
  }
  return true; // try anyway
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await supa.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const imageUrl: string = body.image_url;
    const caption: string = (body.caption || "").slice(0, 2200);
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) throw new Error("image_url HTTPS é obrigatório");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: acc } = await admin.from("instagram_accounts").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!acc) throw new Error("Instagram não conectado");

    // 1) container
    const c = await fetch(`https://graph.facebook.com/v21.0/${acc.ig_user_id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: acc.access_token }),
    });
    const cj = await c.json();
    if (!c.ok || !cj.id) throw new Error("container failed: " + JSON.stringify(cj));

    await waitContainerReady(acc.ig_user_id, cj.id, acc.access_token);

    // 2) publish
    const p = await fetch(`https://graph.facebook.com/v21.0/${acc.ig_user_id}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: cj.id, access_token: acc.access_token }),
    });
    const pj = await p.json();
    if (!p.ok || !pj.id) throw new Error("publish failed: " + JSON.stringify(pj));

    // fetch permalink
    const m = await fetch(`https://graph.facebook.com/v21.0/${pj.id}?fields=permalink,media_url&access_token=${encodeURIComponent(acc.access_token)}`);
    const mj = await m.json();

    return new Response(JSON.stringify({ ok: true, media_id: pj.id, permalink: mj.permalink || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
