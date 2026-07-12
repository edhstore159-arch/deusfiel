import { useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { Lock, FileText, ChevronDown, ChevronUp } from "lucide-react";

const PASSWORD = "DeusFiel,08";

const SECTIONS = [
  {
    title: "Secretária Virtual (WhatsApp)",
    stack: "Ollama (LLM local) + Twilio WhatsApp + edge function whatsapp-twilio-webhook",
    items: [
      "Recepção 24/7 de mensagens no WhatsApp via webhook Twilio.",
      "Persona fixa: Kênia Garcia — nunca revela ser IA.",
      "Detecção automática de estilo do lead (visual/auditivo/cinestésico) e adaptação da linguagem.",
      "Classificação de área jurídica, urgência e score do lead a cada mensagem.",
      "Agendamento automático: trigger create_appointment_from_whatsapp extrai data/hora e cria appointments.",
      "Envio de áudios (voz) via voicemagic-tts + Watzzap Audio API.",
    ],
  },
  {
    title: "Copiloto Jurídico / Chat IA",
    stack: "Lovable AI Gateway → openai/gpt-5.5 (padrão) + fallback OpenAI direto e Emergent (Claude)",
    items: [
      "Reescreve respostas como parecer jurídico técnico (Direito Civil, Previdenciário, Processo).",
      "Cita legislação e jurisprudência majoritária, sem inventar acórdãos.",
      "Roteamento com fallback automático: LOVABLE_API_KEY → OPENAI_API_KEY → EMERGENT_API_KEY.",
      "Edge function: chat-ai.",
    ],
  },
  {
    title: "Juiz Virtual",
    stack: "judge-ai edge function → Claude 3.5 Sonnet (via Emergent) + fallback GPT",
    items: [
      "Atua como magistrado brasileiro de Direito Previdenciário.",
      "Transforma respostas técnicas em PARECER JURÍDICO estruturado.",
      "Complementa com jurisprudência do STF/STJ/TNU quando aplicável.",
    ],
  },
  {
    title: "Gerador de Imagens / Criativos",
    stack: "generate-cover-image + edit-creative + fuse-images (Nano Banana / Gemini 3 Pro Image / GPT-Image-2)",
    items: [
      "Template obrigatório para animais: [quantidade] + [nome em inglês/científico] + [descrição visual] + [estilo].",
      "SUBJECT LOCK por espécie: sabiá, tucano, arara, beija-flor, coruja, flamingo, penguin etc. — sem substituir espécie.",
      "OBJECT_FIDELITY_LOCK: anatomia correta (bico, penas, patas) e proporções reais.",
      "Dimensões corretas por formato: 1024x1792 (Reels/9:16), 1792x1024 (Banner/16:9), 1024x1024 (Feed).",
      "Deduplicação por id + storage_path + hash da imagem na galeria.",
    ],
  },
  {
    title: "Vídeo & Voz",
    stack: "emergent-video + enhance-video-prompt + transcribe-audio + voicemagic-tts",
    items: [
      "Geração de vídeo viral com prompt enhancer.",
      "Transcrição de áudios recebidos no WhatsApp.",
      "TTS com voz personalizada da secretária (sem emojis, sem rosto).",
    ],
  },
  {
    title: "Segurança & Infra",
    stack: "Lovable Cloud (Supabase) — RLS + user_roles + has_role SECURITY DEFINER",
    items: [
      "RLS habilitada em todas as tabelas públicas.",
      "Roles em tabela separada (user_roles) — sem escalada de privilégio.",
      "Secrets no backend: LAK, OAK, EAK, GAK (acesso restrito por senha em /app/settings).",
      "Debug Tool oculto — ativado por keyword secreta.",
    ],
  },
];

export default function SystemReportCard() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("system_report_unlocked") === "1");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(true);

  const tryUnlock = (e) => {
    e.preventDefault();
    if (pwd === PASSWORD) {
      sessionStorage.setItem("system_report_unlocked", "1");
      setUnlocked(true);
      setErr("");
      setPwd("");
    } else {
      setErr("Senha incorreta.");
    }
  };

  if (!unlocked) {
    return (
      <Card className="mx-4 mt-4 p-4 border-nude-200">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-gold-600" />
          <h3 className="font-display font-semibold text-sm">Relatório do Sistema (restrito)</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">Admin</Badge>
        </div>
        <p className="text-xs text-nude-500 mb-3">Informe a senha para visualizar o relatório completo das funcionalidades.</p>
        <form onSubmit={tryUnlock} className="flex items-center gap-2 max-w-sm">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha"
            className="flex-1 border border-nude-300 rounded px-3 py-2 text-sm"
            autoComplete="off"
          />
          <Button type="submit" size="sm">Acessar</Button>
        </form>
        {err && <div className="text-xs text-rose-600 mt-2">{err}</div>}
      </Card>
    );
  }

  return (
    <Card className="mx-4 mt-4 p-4 border-nude-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 mb-3"
      >
        <FileText className="w-4 h-4 text-gold-600" />
        <h3 className="font-display font-semibold text-sm">Relatório do Sistema — Funcionalidades</h3>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Desbloqueado</Badge>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="grid md:grid-cols-2 gap-3">
          {SECTIONS.map((s) => (
            <div key={s.title} className="border border-nude-200 rounded-md p-3 bg-nude-50/40">
              <div className="font-semibold text-sm text-nude-900">{s.title}</div>
              <div className="text-[11px] text-gold-700 font-mono mb-2">{s.stack}</div>
              <ul className="list-disc list-inside space-y-1 text-xs text-nude-700">
                {s.items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
