import { useState, useEffect } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Button } from "@/kenia/components/ui/button";
import { ExternalLink, Mail, Copy, Sparkles, Ticket, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const COUPONS_KEY = "kenia.emergent.coupons";
const COUPON_VALUE = 6;
function generateCouponCode() {
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return `KENIA6-${rand}`;
}

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

  const [coupons, setCoupons] = useState(() => {
    try { return JSON.parse(localStorage.getItem(COUPONS_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(COUPONS_KEY, JSON.stringify(coupons)); } catch {}
  }, [coupons]);

  function addCoupon() {
    const code = generateCouponCode();
    setCoupons((prev) => [{ code, value: COUPON_VALUE, createdAt: Date.now(), used: false }, ...prev].slice(0, 20));
    try { navigator.clipboard.writeText(code); } catch {}
    toast.success(`Cupom ${code} gerado e copiado (R$ ${COUPON_VALUE})`);
  }
  function copyCoupon(code) {
    navigator.clipboard.writeText(code).then(
      () => toast.success("Cupom copiado"),
      () => toast.error("Não foi possível copiar"),
    );
  }
  function toggleUsed(code) {
    setCoupons((prev) => prev.map((c) => c.code === code ? { ...c, used: !c.used } : c));
  }
  function removeCoupon(code) {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
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

      <Card className="p-6 border-nude-200 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-nude-900 font-medium">
              <Ticket className="w-4 h-4 text-gold-600" /> Cupons de desconto R$ {COUPON_VALUE}
            </div>
            <p className="text-xs text-nude-500 mt-1">
              Códigos promocionais para colar no campo de cupom da Plataforma IA. Válidos até serem aceitos pela plataforma.
            </p>
          </div>
          <Button onClick={addCoupon} className="h-10 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> Gerar cupom R$ {COUPON_VALUE}
          </Button>
        </div>

        {coupons.length === 0 ? (
          <p className="text-sm text-nude-500">Nenhum cupom gerado ainda. Clique em "Gerar cupom" para criar um.</p>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.code} className={`flex items-center justify-between gap-3 rounded-md border p-3 ${c.used ? "border-nude-200 bg-nude-50 opacity-60" : "border-gold-300/60 bg-gold-50/40"}`}>
                <div className="min-w-0">
                  <div className="font-mono text-sm text-nude-900">{c.code}</div>
                  <div className="text-xs text-nude-500">R$ {c.value},00 • {new Date(c.createdAt).toLocaleString("pt-BR")} {c.used && "• Usado"}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => copyCoupon(c.code)}><Copy className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggleUsed(c.code)}>{c.used ? "Reativar" : "Marcar usado"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => removeCoupon(c.code)} className="text-nude-500">Remover</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-nude-500 leading-relaxed">
          Aviso: os cupons são gerados localmente neste dispositivo para você organizar promoções.
          A aceitação depende da Plataforma IA — se o código não for reconhecido no checkout, entre em contato
          com o suporte da plataforma para vincular a promoção à sua conta.
        </p>
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
