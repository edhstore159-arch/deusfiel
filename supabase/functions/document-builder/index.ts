import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatPipeline } from "../_shared/llm.ts";

const SYSTEM_PROMPT = `Você é um construtor de documentos jurídicos profissional brasileiro. Sua função é criar, editar e aprimorar documentos jurídicos completos e tecnicamente corretos.

REGRAS:
- Sempre use linguagem formal jurídica brasileira
- Nunca invente artigos de lei — use apenas os que tiver certeza absoluta
- Formatamento: use HTML semântico para petições, contratos e pareceres
- Quando solicitado, retorne o documento em formato HTML pronto para impressão
- Inclua cabeçalho, ementas, fundamentação e dispositivos quando aplicável
- Para petições: enderece ao juízo correto, inclua dados das partes, fatos, fundamentação e pedidos
- Para contratos: inclua cláusulas completas com obrigações, penalidades, foro e assinaturas
- Para pareceres: inclua análise técnica, fundamentação legal e conclusão

FORMATO DE RESPOSTA:
- Responda SEMPRE em JSON com esta estrutura:
{
  "response": "Explicação do que foi feito e orientações",
  "files": {
    "nome-do-arquivo.html": "<!DOCTYPE html>...conteúdo HTML completo...",
    "documento.txt": "versão em texto puro se necessário"
  }
}

Se não houver arquivos para gerar, retorne files como objeto vazio.
Se o usuário apenas perguntar algo, responda normalmente em "response" com files vazio.`;

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
      ...history.slice(-15).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    console.log("[document-builder] Chamando IA para:", message.slice(0, 80));

    const aiResult = await chatPipeline({
      messages,
      temperature: 0.4,
      maxTokens: 4000,
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

    let response = rawText;
    let files: Record<string, string> = {};

    function tryParseJson(text: string): { response: string; files: Record<string, string> } | null {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          return {
            response: String(parsed.response || text),
            files: (parsed.files && typeof parsed.files === "object") ? parsed.files : {},
          };
        }
      } catch {}
      return null;
    }

    // Extract HTML from markdown code blocks
    function extractHtml(text: string): string | null {
      const htmlMatch = text.match(/```html\s*([\s\S]*?)```/i);
      if (htmlMatch) return htmlMatch[1].trim();
      // Check if it's raw HTML
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        return text.replace(/```/g, "").trim();
      }
      return null;
    }

    // Try parsing the raw text directly as JSON
    let parsed = tryParseJson(rawText);

    // If raw text is not valid JSON, try extracting JSON from markdown or text
    if (!parsed) {
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = tryParseJson(jsonMatch[1] || jsonMatch[0]);
      }
    }

    // If still no luck, the AI may have returned JSON-as-string (double-encoded)
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

    // If no files found but we have HTML in the response, extract it
    if (Object.keys(files).length === 0) {
      const htmlContent = extractHtml(rawText);
      if (htmlContent) {
        const docName = documentType.toLowerCase().replace(/\s+/g, "-") + ".html";
        files[docName] = htmlContent;
        response = rawText.replace(/```html\s*([\s\S]*?)```/i, "").replace(/```/g, "").trim() || response;
      }
    }

    if (Object.keys(files).length === 0 && !parsed) {
      console.log("[document-builder] Resposta não é JSON, usando como texto plano");
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
