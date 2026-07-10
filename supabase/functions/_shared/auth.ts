// Shared JWT auth helper for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function requireUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "auth required" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supa.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  return { userId: String(data.claims.sub) };
}

export async function requireAdmin(req: Request): Promise<{ userId: string } | Response> {
  const res = await requireUser(req);
  if (res instanceof Response) return res;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", res.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) {
    return new Response(JSON.stringify({ error: "admin required" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  return res;
}
