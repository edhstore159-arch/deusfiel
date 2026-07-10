import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion } from "../_shared/llm.ts";
import { requireUser } from "../_shared/auth.ts";

const SYSTEM = `Você é um diretor de fotografia e prompt engineer especializado em geração de vídeo realista no estilo HEYGEN — apresentador virtual humano falando para a câmera (Veo / Sora / Runway / Kling).
Sua tarefa: receber uma cena/roteiro em português e produzir UM ÚNICO prompt em INGLÊS, otimizado para vídeo full HD 1080p de um AVATAR HUMANO REALISTA apresentando, com sincronização labial perfeita.

REGRAS DUROS (HeyGen-style virtual presenter):
- Sempre UMA ÚNICA tomada contínua (single continuous shot). Sem cortes, sem split-screen, sem transições, sem múltiplas cenas.
- AVATAR: pessoa fotorrealista (especifique gênero, idade aparente 28-45, etnia brasileira quando não dito o contrário), roupa social ou semi-social (blazer, camisa, blusa elegante), cabelo bem cuidado, maquiagem natural se mulher, barba aparada se homem.
- POSE/ENQUADRAMENTO: medium close-up ou waist-up, olhando DIRETAMENTE para a câmera (eye contact constante, como apresentador HeyGen), postura ereta e confiante, mãos visíveis com gestos sutis e naturais reforçando a fala (no máximo 1-2 gestos).
- BOCA E FALA: lip-sync perfeito, articulação clara de cada sílaba, lábios e dentes se movem de forma anatomicamente correta com a fala em PORTUGUÊS BRASILEIRO, micro-pausas naturais para respirar, leves movimentos de sobrancelha e olhar acompanhando ênfase.
- VOZ implícita: portuguese (Brazil) voiceover, tom humano envolvente, ritmo natural (nem rápido, nem robótico), ênfase em palavras-chave.
- AMBIENTE: escritório moderno, estúdio elegante OU fundo neutro suavemente desfocado (bokeh), iluminação SOFTBOX profissional de 3 pontos (key + fill + rim), key light suave a 45°, sem sombras duras.
- CÂMERA: lente 50mm ou 85mm f/2.0, eye-level, locked tripod OU push-in MUITO sutil (quase imperceptível), profundidade de campo rasa isolando o apresentador.
- ESTÉTICA: hiper-realismo 4K/1080p, pele com textura real (poros, peach fuzz, pequenas imperfeições), olhos vivos com catchlight nítido, fios de cabelo individuais, sem efeito plástico, sem beauty filter exagerado.
- ROTEIRO/SCRIPT: incorpore literalmente a fala fornecida pelo usuário entre aspas no prompt como "speaking the following script in Brazilian Portuguese: '...'". NÃO corte, NÃO resuma e NÃO traduza o roteiro.
- NEGATIVOS no final: "no cartoon, no anime, no 3d render, no plastic skin, no beauty filter, no dead eyes, no glassy stare, no asymmetric eyes, no extra fingers, no malformed hands, no morphing face, no scene cuts, no split screen, no multiple people, no captions, no on-screen text, no logo, no watermark, no robotic voice, no out-of-sync lips".
- Comprimento ideal: 120 a 200 palavras. Sem listas, sem markdown. Texto corrido em inglês.`;


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _auth_res = await requireUser(req);
  if (_auth_res instanceof Response) return _auth_res;
  try {
    const { scene, category, mood, durationSeconds } = await req.json();
    if (!scene || typeof scene !== "string") {
      return new Response(JSON.stringify({ error: "scene obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userMsg = `CENA (pt-BR): ${scene}
CATEGORIA: ${category || "narrativa"}
HUMOR: ${mood || "natural, expressivo"}
DURAÇÃO: ${durationSeconds || 12} segundos
Gere o prompt final em inglês agora.`;

    const r = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      temperature: 0.7,
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: r.error || "falha no provider", provider: r.provider || "none" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const prompt = String(r.data?.choices?.[0]?.message?.content || "").trim();
    return new Response(JSON.stringify({ prompt, provider: r.provider }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
