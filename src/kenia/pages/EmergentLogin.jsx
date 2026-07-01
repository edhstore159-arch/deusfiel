import { useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Button } from "@/kenia/components/ui/button";
import { ExternalLink, Mail, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "kenia.emergent.email";
const REFERRAL_SIGNUP_URL = "https://app.emergent.sh/register?ref=mate800341";
const PLATFORM_URLS = [
  { label: "Plataforma IA (login principal)", url: "https://app.emergent.sh/" },
  { label: "Criar conta com Google (promoção)", url: REFERRAL_SIGNUP_URL, highlight: true },
  { label: "Painel da Plataforma IA", url: "https://emergentagent.com/" },
  { label: "Esqueci a senha", url: "https://app.emergent.sh/forgot-password" },
];

export default function EmergentLogin() {
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });

  function save(e) {
    try { localStorage.setItem(STORAGE_KEY, e); } catch {}
    setEmail(e);
  }

  function openLogin(url) {
    if (email) {
      try { navigator.clipboard.writeText(email); toast.success("E-mail copiado — cole no login"); } catch {}
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function copyEmail() {
    if (!email) return;
    navigator.clipboard.writeText(email).then(
      () => toast.success("E-mail copiado"),
      () => toast.error("Não foi possível copiar"),
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-gold-600 mb-2">Ferramentas</div>
        <h1 className="font-display text-3xl text-nude-900">Login Plataforma IA</h1>
        <p className="text-sm text-nude-500 mt-1">
          Acesso rápido à plataforma de créditos de IA. Salve seu e-mail aqui para nunca mais esquecer
          — ao abrir o login, ele é copiado automaticamente para colar no formulário.
        </p>
      </div>

      <Card className="p-6 border-nude-200 space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-nude-700">Seu e-mail de acesso</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              type="email"
              placeholder="seu-email@dominio.com"
              value={email}
              onChange={(e) => save(e.target.value)}
              className="h-11 bg-card border-nude-200 focus-visible:ring-gold-400"
            />
            <Button variant="outline" onClick={copyEmail} disabled={!email} className="h-11">
              <Copy className="w-4 h-4 mr-2" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-nude-500 mt-1.5">
            Guardado apenas neste navegador. Use para lembrar qual conta você usa na plataforma.
          </p>
        </div>

        <div className="space-y-2">
          {PLATFORM_URLS.map((item) => (
            <Button
              key={item.url}
              onClick={() => openLogin(item.url)}
              className="w-full justify-between h-11 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> {item.label}
              </span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-5 border-nude-200 bg-nude-50/40">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-gold-600 mt-0.5" />
          <div className="text-sm text-nude-700 space-y-1.5">
            <p><strong>Como funciona:</strong></p>
            <ol className="list-decimal pl-5 space-y-1 text-nude-600">
              <li>Salve seu e-mail acima (fica salvo localmente).</li>
              <li>Clique em "Plataforma IA (login principal)" — abre em nova aba.</li>
              <li>O e-mail é copiado automaticamente — basta colar no campo e digitar sua senha.</li>
              <li>Se esqueceu a senha, use o link "Esqueci a senha".</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
