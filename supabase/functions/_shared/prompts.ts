// Shared helper for reading/writing evolved agent prompts from Supabase DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let _adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _adminClient;
}

/**
 * Get the active evolved prompt for an agent type + area.
 * Falls back to null if no evolved prompt exists.
 */
export async function getEvolvedPrompt(
  agentType: "lawyer" | "judge" | "secretary",
  area?: string,
): Promise<string | null> {
  try {
    const supa = getAdminClient();
    const { data, error } = await supa
      .from("agent_prompts")
      .select("prompt")
      .eq("agent_type", agentType)
      .eq("is_active", true)
      .eq("area", area || "general")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.prompt) return null;
    return data.prompt;
  } catch {
    return null;
  }
}

/**
 * Save an improved prompt to the DB. Creates a new version.
 */
export async function saveEvolvedPrompt(
  agentType: "lawyer" | "judge" | "secretary",
  area: string | undefined,
  prompt: string,
  score: number = 0,
  metadata: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const supa = getAdminClient();
    const normalizedArea = area || "general";
    const id = `${agentType}-${normalizedArea}`;

    // Get current max version
    const { data: existing } = await supa
      .from("agent_prompts")
      .select("version")
      .eq("id", id)
      .maybeSingle();

    const newVersion = (existing?.version || 0) + 1;

    const { error } = await supa.from("agent_prompts").upsert({
      id,
      agent_type: agentType,
      area: normalizedArea,
      prompt,
      score,
      version: newVersion,
      is_active: true,
      source: "training",
      metadata,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) {
      console.error("[prompts] save error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[prompts] save exception:", e);
    return false;
  }
}

/**
 * Deactivate all previous versions for an agent type + area.
 */
export async function deactivateOldPrompts(
  agentType: "lawyer" | "judge" | "secretary",
  area?: string,
): Promise<void> {
  try {
    const supa = getAdminClient();
    const normalizedArea = area || "general";
    await supa
      .from("agent_prompts")
      .update({ is_active: false })
      .eq("agent_type", agentType)
      .eq("area", normalizedArea)
      .eq("is_active", true);
  } catch {}
}
