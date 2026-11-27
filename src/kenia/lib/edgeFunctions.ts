import { supabase } from "@/integrations/supabase/client";

const EDGE_TIMEOUT_MS = 8000;

function withTimeout(promise: Promise<any>, ms: number) {
  let timer: any;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("edge_function_timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function invokeEdgeFunction(functionName: string, body?: any) {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke(functionName, { body }),
      EDGE_TIMEOUT_MS
    );
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    const msg = String(err?.message || err || "").toLowerCase();
    const isNetworkOrTimeout =
      msg.includes("failed to fetch") ||
      msg.includes("network error") ||
      msg.includes("edge_function_timeout") ||
      msg.includes("transport error") ||
      !err?.status;
    if (isNetworkOrTimeout) {
      // Retorna resultado vazio sem quebrar a UI
      return { data: null, error: null, fallback: true };
    }
    throw err;
  }
}
