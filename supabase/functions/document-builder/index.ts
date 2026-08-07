import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion } from "../_shared/llm.ts";

const SYSTEM_PROMPT = `Você é um construtor de documentos jurídicos profissional brasileiro. Sua função é criar, editar e aprimorar documentos jurídicos completos e tecnicamente corretos.

REGRAS OBRIGATÓRIAS:
- Sempre use linguagem formal jurídica brasileira
- Nunca invente artigos de lei — use apenas os que tiver certeza absoluta
- SEMPRE retorne JSON válido com a estrutura abaixo
- Para petições/contratos/pareceres: gere HTML semântico completo (com <!DOCTYPE html>, <html>, <head>, <body>)
- Inclua cabeçalho, endereçamento, fatos, fundamentação, pedidos, dispositivo e assinaturas

FORMATO DE RESPOSTA OBRIGATÓRIO (SEMPRE JSON):
{
  "response": "Explicação do que foi feito e orientações",
  "files": {
    "peticao-inicial.html": "<!DOCTYPE html>...HTML COMPLETO...",
    "documento.txt": "versão em texto puro se necessário"
  }
}

NÃO retorne markdown, NÃO retorne texto solto. SEMPRE JSON válido.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message: string = String(body.message ?? "").trim();
    const history: Array<{ role: string; content: string }> = Array.isArray(body.history) ? body.history : [];
    const projectFiles: Record<string, string> = body.project_files && typeof body.project_files === "object" ? body.project_files : {};
    const documentType: string = String(body.document_type ?? "Petição Inicial").trim();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Mensagem é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contextParts: string[] = [];
    contextParts.push(`TIPO DE DOCUMENTO: ${documentType}`);

    if (Object.keys(projectFiles).length > 0) {
      contextParts.push(`\nARQUIVOS EXISTENTES NO PROJETO:\n${Object.entries(projectFiles).map(([k, v]) => `--- ${k} ---\n${String(v).slice(0, 3000)}`).join("\n\n")}`);
    }

    const systemMsg = `${SYSTEM_PROMPT}\n\n${contextParts.join("\n")}`;

    const messages = [
      { role: "system", content: systemMsg },
      ...history.slice(-15).map((m) => ({ role: m.content })),
      { role: "user", content: message },
    ];

    console.log("[document-builder] Chamando IA para:", message.slice(0, 80));

    const aiResult = await chatCompletion({
      messages,
      temperature: 0.3,
      maxTokens: 8000,
      response_format: { type: "json_object" },
    });

    if (!aiResult.ok) {
      console.error("[document-builder] AI failed:", aiResult.error);
      return new Response(
        JSON.stringify({ error: "Falha ao gerar documento", details: String(aiResult.error || "").slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawText = aiResult.data?.choices?.[0]?.message?.content || "";
    console.log("[document-builder] Resposta IA, tamanho:", rawText.length, "provider:", aiResult.provider);

    let response = "Documento gerado.";
    let files: Record<string, string> = {};

    function tryParseJson(text: string): { response: string; files: Record<string, string> } | null {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          return {
            response: String(parsed.response || "Documento gerado."),
            files: (parsed.files && typeof parsed.files === "object") ? parsed.files : {},
          };
        }
      } catch {}
      return null;
    }

    let parsed = tryParseJson(rawText);

    // Se não parseou, tenta extrair JSON de dentro de markdown ou texto
    if (!parsed) {
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = tryParseJson(jsonMatch[1] || jsonMatch[0]);
      }
    }

    if (!parsed && rawText.includes('\\"')) {
      try {
        const unescaped = rawText.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        parsed = tryParseJson(unescaped);
      } catch {}
    }

    if (parsed) {
      response = parsed.response;
      files = parsed.files;
    }

    // Garantir que SEMPRE haja HTML para petições
    if (Object.keys(files).length === 0) {
      // Tenta extrair HTML do texto
      const htmlMatch = rawText.match(/```html\s*([\s\S]*?)```/i);
      if (htmlMatch) {
        const docName = documentType.toLowerCase().replace(/\s+/g, "-") + ".html";
        files[docName] = htmlMatch[1].trim();
      } else if (rawText.includes("<!DOCTYPE") || rawText.includes("<html")) {
        const docName = documentType.toLowerCase().replace(/\s+/g, "-") + ".html";
        files[docName] = rawText.replace(/```/g, "").trim();
      } else {
        // Fallback: cria HTML básico a partir do texto
        const docName = documentType.toLowerCase().replace(/\s+/g, "-") + ".html";
        const txt = rawText.replace(/</g, "<").replace(/>/g, ">");
        files[docName] = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.8; color: #1a1a1a; font-size: 14px; }
  h1, h2, h3 { font-family: 'Times New Roman', Times, serif; text-align: center; margin-bottom: 1em; }
  h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
  p { text-indent: 2em; margin-bottom: 0.8em; text-align: justify; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1em; margin-bottom: 2em; }
  .signature { margin-top: 3em; text-align: center; }
  .signature-line { border-top: 1px solid #333; width: 300px; margin: 2em auto 0.5em; }
</style>
</head>
<body>
<pre style="white-space: pre-wrap; font-family: inherit; text-indent: 0;">${txt}</pre>
</body>
</html>`;
        files["documento.txt"] = rawText;
      }
    }

    return new Response(
      JSON.stringify({ response, files, provider: aiResult.provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[document-builder] fatal:", err);
    return new Response(
      JSON.stringify({ error: `Erro interno: ${String((err as Error)?.message || err).slice(0, 300)}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
