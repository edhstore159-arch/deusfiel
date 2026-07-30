import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative, dirname } from "node:path";

const TABLE = "wa_auth_state";

export function createAuthBackup(supabase) {
  if (!supabase) {
    console.warn("[auth-backup] Supabase não disponível — backup desativado");
    return { backup: () => 0, restore: () => 0, hasBackup: () => false, saveCreds: () => {} };
  }

  async function readAllFiles(authDir) {
    const files = {};
    async function walk(dir) {
      let entries;
      try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = join(dir, e.name);
        if (e.isDirectory()) {
          await walk(full);
        } else if (e.isFile()) {
          const rel = relative(authDir, full);
          files[rel] = await readFile(full, "utf-8");
        }
      }
    }
    await walk(authDir);
    return files;
  }

  async function fullBackup(authDir) {
    if (!supabase) return 0;
    const files = await readAllFiles(authDir);
    const entries = Object.keys(files);
    if (!entries.length) return 0;

    const rows = entries.map((id) => ({
      id,
      value: files[id],
      updated_at: new Date().toISOString(),
    }));

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase
        .from(TABLE)
        .upsert(batch, { onConflict: "id" });
      if (error) {
        console.error("[auth-backup] fullBackup batch error:", error);
        throw error;
      }
    }
    return rows.length;
  }

  async function restore(authDir) {
    if (!supabase) return 0;
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, value");
    if (error) {
      console.error("[auth-backup] restore select error:", error);
      throw error;
    }
    if (!data?.length) return 0;

    await mkdir(authDir, { recursive: true });
    for (const row of data) {
      const filePath = join(authDir, row.id);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, row.value, "utf-8");
    }
    console.log(`[auth-backup] Restaurados ${data.length} arquivos de auth do Supabase`);
    return data.length;
  }

  async function hasBackup() {
    if (!supabase) return false;
    const { data } = await supabase
      .from(TABLE)
      .select("id")
      .eq("id", "creds.json")
      .limit(1)
      .maybeSingle();
    return !!data;
  }

  async function saveCreds(authDir) {
    if (!supabase) return;
    try {
      const value = await readFile(join(authDir, "creds.json"), "utf-8");
      const { error } = await supabase
        .from(TABLE)
        .upsert(
          { id: "creds.json", value, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        );
      if (error) console.error("[auth-backup] saveCreds error:", error);
    } catch {}
  }

  return { backup: fullBackup, restore, hasBackup, saveCreds };
}
