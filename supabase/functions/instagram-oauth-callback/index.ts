// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyState } from "../_shared/oauth-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function htmlResponse(title: string, body: string, returnTo: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui;padding:32px;max-width:560px;margin:auto;color:#222}
.card{border:1px solid #e5e5e5;border-radius:12px;padding:24px;background:#fff}
.ok{color:#0a7c2f}.err{color:#b00020}a.btn{display:inline-block;margin-top:16px;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none}</style>
</head><body><div class="card">${body}
<a class="btn" href="${returnTo || "/"}">Voltar ao app</a></div>
<script>setTimeout(()=>{ try{ window.opener && window.opener.postMessage({type:"instagram-connected"},"*"); }catch(e){} },300);</script>
</body></html>`;
  return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") || "";
  let state: any = {};
  try { state = JSON.parse(atob(stateRaw)); } catch {}
  const returnTo = state.return_to || "/";

  try {
    if (!code) throw new Error("missing code");
    if (!state.uid) throw new Error("invalid state");
    const appId = Deno.env.get("INSTAGRAM_APP_ID");
    const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET");
    if (!appId || !appSecret) throw new Error("INSTAGRAM_APP_ID/SECRET not configured");

    const redirectUri = `https://wfycqufqdheluvzhgvfw.supabase.co/functions/v1/instagram-oauth-callback`;

    // 1) short-lived token
    const t1 = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`);
    const t1j = await t1.json();
    if (!t1.ok || !t1j.access_token) throw new Error("token exchange failed: " + JSON.stringify(t1j));

    // 2) long-lived token (~60 days)
    const t2 = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${t1j.access_token}`);
    const t2j = await t2.json();
    const userToken = t2j.access_token || t1j.access_token;
    const expiresIn = Number(t2j.expires_in || t1j.expires_in || 3600);

    // 3) list pages
    const pages = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(userToken)}&fields=id,name,access_token,instagram_business_account{id,username}`);
    const pagesJ = await pages.json();
    if (!pages.ok) throw new Error("pages fetch failed: " + JSON.stringify(pagesJ));
    const page = (pagesJ.data || []).find((p: any) => p.instagram_business_account?.id);
    if (!page) throw new Error("Nenhuma página com conta Instagram Business vinculada. Vincule sua conta IG Business à página do Facebook.");

    const ig = page.instagram_business_account;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    await admin.from("instagram_accounts").upsert({
      user_id: state.uid,
      ig_user_id: ig.id,
      ig_username: ig.username || null,
      page_id: page.id,
      page_name: page.name || null,
      access_token: page.access_token,
      expires_at: expiresAt,
    }, { onConflict: "user_id,ig_user_id" });

    return htmlResponse("Instagram conectado",
      `<h2 class="ok">✓ Instagram @${ig.username || ig.id} conectado</h2>
       <p>Página: <b>${page.name}</b></p>
       <p>Você já pode publicar criativos diretamente no Instagram.</p>`,
      returnTo);
  } catch (e: any) {
    return htmlResponse("Erro Instagram",
      `<h2 class="err">Falha ao conectar</h2><pre style="white-space:pre-wrap;font-size:12px">${String(e?.message || e)}</pre>`,
      returnTo);
  }
});
