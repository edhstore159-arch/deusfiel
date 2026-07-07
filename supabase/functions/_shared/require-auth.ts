// Shared JWT validation for edge functions that must not be called anonymously.
import { createClient } from "npm:@supabase/supabase-js@2";

export type AuthResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; response: Response };

export async function requireAuthenticatedUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");

  const unauthorized = (msg: string) =>
    new Response(JSON.stringify({ error: msg }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!token) return { ok: false, response: unauthorized("Autenticação obrigatória") };
  if (!url || !anon) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Auth não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  try {
    const client = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.id) {
      return { ok: false, response: unauthorized("Token inválido ou expirado") };
    }
    return { ok: true, userId: data.user.id, email: data.user.email ?? null };
  } catch (_e) {
    return { ok: false, response: unauthorized("Falha ao validar token") };
  }
}
