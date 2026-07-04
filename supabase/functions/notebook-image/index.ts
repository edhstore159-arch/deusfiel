import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { generateWithNanoBanana } from "../_shared/nano-banana.ts";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const toBase64Utf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  }
  return btoa(binary);
};

const wrapText = (value: string, maxChars = 46) => {
  const lines: string[] = [];
  for (const rawLine of value.replace(/\r\n/g, "\n").split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines.slice(0, 22);
};

const buildNotebookSvg = (text: string) => {
  const lines = wrapText(text);
  const tspans = lines
    .map((line, index) =>
      `<tspan x="150" y="${188 + index * 38}">${escapeXml(line || " ")}</tspan>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000" flood-opacity="0.18"/></filter>
    <pattern id="paper" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="#fbfaf4"/><circle cx="12" cy="20" r="1" fill="#e8e0cf" opacity="0.35"/><circle cx="62" cy="58" r="1" fill="#e8e0cf" opacity="0.28"/></pattern>
  </defs>
  <rect width="1200" height="1600" fill="#d9c7aa"/>
  <rect x="90" y="70" width="1020" height="1460" rx="18" fill="url(#paper)" filter="url(#shadow)"/>
  <rect x="126" y="70" width="5" height="1460" fill="#ef6b6b" opacity="0.75"/>
  ${Array.from({ length: 32 }, (_, i) => `<line x1="120" x2="1060" y1="${178 + i * 38}" y2="${178 + i * 38}" stroke="#96b6da" stroke-width="2" opacity="0.55"/>`).join("")}
  ${Array.from({ length: 18 }, (_, i) => `<circle cx="72" cy="${146 + i * 76}" r="12" fill="#d9c7aa" opacity="0.9"/><circle cx="72" cy="${146 + i * 76}" r="6" fill="#b99f7f" opacity="0.35"/>`).join("")}
  <text font-family="'Comic Sans MS', 'Bradley Hand', 'Segoe Print', cursive" font-size="31" fill="#183a72" opacity="0.96" transform="rotate(-0.7 600 700)">${tspans}</text>
  <text x="150" y="1465" font-family="'Comic Sans MS', cursive" font-size="20" fill="#183a72" opacity="0.38">gerado como caderno escrito à mão</text>
</svg>`;
  return `data:image/svg+xml;base64,${toBase64Utf8(svg)}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { text } = await req.json();
    const userText = String(text || "").trim();
    if (!userText) {
      return new Response(JSON.stringify({ error: "text obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const prompt = [
      "Create a photorealistic image of an open lined notebook page (caderno pautado)",
      "with the following text handwritten in blue or black ballpoint pen, in natural,",
      "slightly imperfect cursive handwriting as if written by a real person. The paper",
      "should show subtle texture, light shadows, and horizontal ruled lines. Keep the",
      "handwriting legible and well-spaced. Do NOT add any other text or watermarks.",
      "",
      "TEXT TO HANDWRITE (preserve exactly, including line breaks):",
      userText,
    ].join("\n");

    const result = await generateWithNanoBanana({
      prompt,
      mode: "generate",
      preferProvider: Deno.env.get("EMERGENT_API_KEY") ? "emergent" : "pollinations",
    });

    return new Response(JSON.stringify({
      image: result.url || buildNotebookSvg(userText),
      provider: result.url ? result.provider : "local-notebook",
      warning: result.url ? undefined : result.error,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ image: buildNotebookSvg(String((e as Error)?.message || e)), provider: "local-notebook" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
