// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await supa.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: acc } = await admin.from("instagram_accounts").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!acc) return new Response(JSON.stringify({ connected: false, media: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";
    const r = await fetch(`https://graph.facebook.com/v21.0/${acc.ig_user_id}/media?fields=${fields}&limit=24&access_token=${encodeURIComponent(acc.access_token)}`);
    const j = await r.json();
    if (!r.ok) return new Response(JSON.stringify({ connected: true, error: j }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({
      connected: true,
      account: { ig_user_id: acc.ig_user_id, ig_username: acc.ig_username, page_name: acc.page_name },
      media: j.data || [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
