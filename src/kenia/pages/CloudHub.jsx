import { Card } from "@/kenia/components/ui/card";
import { Badge } from "@/kenia/components/ui/badge";
import { Button } from "@/kenia/components/ui/button";
import { Cloud, Database, Server, KeyRound, Bot, ShieldCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const SERVICES = [
  { icon: Database, title: "Banco de Dados", desc: "Tabelas, RLS e migrações gerenciadas pela Lovable Cloud." },
  { icon: Server, title: "Edge Functions", desc: "chat-ai, claude-chat, generate-cover-image e outras rodando em produção." },
  { icon: Bot, title: "IA Gateway", desc: "Lovable AI + Ollama + Gemini + Pollinations com fallback automático." },
  { icon: KeyRound, title: "Secrets", desc: "ANTHROPIC_API_KEY, OPENAI_API_KEY, TWILIO e outros tokens criptografados." },
  { icon: ShieldCheck, title: "Auth & RLS", desc: "Autenticação por e-mail/senha + Google, com políticas por usuário." },
];

export default function CloudHub() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Cloud className="h-7 w-7 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Cloud</h1>
          <p className="text-sm text-muted-foreground">
            Painel central da infraestrutura Lovable Cloud usada por este dashboard.
          </p>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">Online</Badge>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map((s) => (
          <Card key={s.title} className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <s.icon className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold">{s.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Atalhos rápidos</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/claude">Abrir Claude Chat</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/chat-ia">Chat IA · Análise</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/settings">Configurações</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/whatsapp-logs">Logs WhatsApp</Link>
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          <ExternalLink className="h-4 w-4" /> Sobre o free-claude-code
        </h2>
        <p className="text-sm text-muted-foreground">
          O repositório <code>Alishahryar1/free-claude-code</code> é um script Python que roda localmente
          e raspa o claude.ai — não pode ser hospedado dentro do dashboard. Em vez disso, a aba{" "}
          <Link className="text-amber-600 underline" to="/app/claude">Claude</Link> oferece a mesma
          experiência: usa o Claude oficial quando há <code>ANTHROPIC_API_KEY</code>, e cai automaticamente
          no gateway gratuito (Lovable AI / Gemini / Ollama) quando não há.
        </p>
      </Card>
    </div>
  );
}
