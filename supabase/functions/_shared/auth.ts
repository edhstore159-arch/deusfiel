// Shared auth helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type AuthResult =
  | { ok: true; userId: string; email: string | null; token: string }
  | { ok: false; response: Response };

function unauthorized(msg = "auth required"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function forbidden(msg = "forbidden"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Requires a valid Supabase JWT on the request. Returns the resolved user or a 401 Response.
 */
export async function requireUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: unauthorized() };
  }
  const token = authHeader.slice(7).trim();
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return { ok: false, response: unauthorized("auth not configured") };
  try {
    const client = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.id) return { ok: false, response: unauthorized() };
    return { ok: true, userId: data.user.id, email: data.user.email ?? null, token };
  } catch (_err) {
    return { ok: false, response: unauthorized() };
  }
}

/**
 * Requires a valid JWT AND that the user has the given role in public.user_roles.
 */
export async function requireRole(req: Request, role: string): Promise<AuthResult> {
  const auth = await requireUser(req);
  if (!auth.ok) return auth;
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.userId)
    .eq("role", role)
    .maybeSingle();
  if (error || !data) return { ok: false, response: forbidden() };
  return auth;
}
