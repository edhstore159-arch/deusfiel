// Shared auth helpers for edge functions.
// Most functions here deploy with verify_jwt=false; validate JWT in code.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function unauthorized(msg = "auth required") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(msg = "forbidden") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Returns the authenticated user id or a Response to short-circuit. */
export async function requireUser(
  req: Request,
): Promise<{ userId: string; token: string } | Response> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return unauthorized();
  const token = authHeader.slice("Bearer ".length);
  try {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await supa.auth.getClaims(token);
    if (error || !data?.claims?.sub) return unauthorized();
    return { userId: String(data.claims.sub), token };
  } catch {
    return unauthorized();
  }
}

/** Returns admin user id or a Response. */
export async function requireAdmin(req: Request): Promise<{ userId: string } | Response> {
  const res = await requireUser(req);
  if (res instanceof Response) return res;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", res.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) return forbidden("admin only");
  return { userId: res.userId };
}
