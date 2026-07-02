import { useState, useEffect } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Button } from "@/kenia/components/ui/button";
import { ExternalLink, Mail, Copy, Sparkles, Ticket, RefreshCw, Search, Globe, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


const COUPONS_KEY = "kenia.emergent.coupons";


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
  const [newCode, setNewCode] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newPurchase, setNewPurchase] = useState("first"); // "first" | "second"
  useEffect(() => {
    try { localStorage.setItem(COUPONS_KEY, JSON.stringify(coupons)); } catch {}
  }, [coupons]);

  function addCoupon() {
    const code = newCode.trim().toUpperCase();
    if (!code) { toast.error("Cole o código oficial recebido da plataforma"); return; }
    if (coupons.some((c) => c.code === code)) { toast.error("Esse cupom já está salvo"); return; }
    const value = Number(newValue) || 0;
    setCoupons((prev) => [{ code, value, createdAt: Date.now(), used: false, purchase: newPurchase }, ...prev].slice(0, 30));
    setNewCode(""); setNewValue("");
    toast.success(`Cupom ${code} salvo (${newPurchase === "first" ? "1ª compra" : "2ª compra+"})`);
  }
  function setPurchase(code, purchase) {
    setCoupons((prev) => prev.map((c) => c.code === code ? { ...c, purchase } : c));
  }
  function copyCoupon(code) {
    navigator.clipboard.writeText(code).then(
      () => toast.success("Cupom copiado — cole no checkout"),
      () => toast.error("Não foi possível copiar"),
    );
  }
  function toggleUsed(code) {
    setCoupons((prev) => prev.map((c) => c.code === code ? { ...c, used: !c.used } : c));
  }
  function removeCoupon(code) {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
  }

  // ---- Buscador de cupons Emergent na internet ----
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  async function searchOnline() {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-emergent-coupons", { body: {} });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha na busca");
      setSearchResult(data);
      toast.success(`${data.candidates?.length || 0} códigos candidatos encontrados`);
    } catch (e) {
      toast.error(`Erro na busca: ${e.message || e}`);
    } finally {
      setSearching(false);
    }
  }
  function saveCandidate(code) {
    const up = code.toUpperCase();
    if (coupons.some((c) => c.code === up)) { toast.info("Já está no cofre"); return; }
    setCoupons((prev) => [{ code: up, value: 0, createdAt: Date.now(), used: false }, ...prev].slice(0, 30));
    toast.success(`${up} salvo no cofre`);
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
        <div>
          <div className="flex items-center gap-2 text-nude-900 font-medium">
            <Ticket className="w-4 h-4 text-gold-600" /> Cofre de cupons oficiais
          </div>
          <p className="text-xs text-nude-500 mt-1 leading-relaxed">
            <strong>Importante:</strong> cupons válidos só são emitidos pela própria Plataforma IA (por e-mail, promoção
            ou link de indicação). Este cofre serve para <em>guardar</em> os códigos oficiais que você recebeu, para não
            perdê-los. Códigos inventados aqui não seriam aceitos no checkout — por isso o gerador foi removido.
          </p>
        </div>

        <div className="rounded-md border border-gold-300/60 bg-gold-50/50 p-3 space-y-2">
          <div className="text-xs text-nude-700">
            <strong>Ganhe créditos reais:</strong> use o link de indicação abaixo — a promoção aplica bônus automático na
            sua conta ao se cadastrar (sem precisar de cupom).
          </div>
          <Button
            onClick={() => window.open(REFERRAL_SIGNUP_URL, "_blank", "noopener,noreferrer")}
            className="w-full h-10 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Abrir link de indicação (bônus automático)
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_140px_auto] gap-2">
          <Input
            placeholder="Código oficial (ex.: PROMO25)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="h-11 bg-card border-nude-200 focus-visible:ring-gold-400 font-mono"
          />
          <Input
            type="number"
            placeholder="Valor R$"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="h-11 bg-card border-nude-200 focus-visible:ring-gold-400"
          />
          <select
            value={newPurchase}
            onChange={(e) => setNewPurchase(e.target.value)}
            className="h-11 rounded-md border border-nude-200 bg-card px-2 text-sm text-nude-900 focus-visible:ring-gold-400"
          >
            <option value="first">1ª compra</option>
            <option value="second">2ª compra+</option>
          </select>
          <Button onClick={addCoupon} className="h-11 bg-nude-900 hover:bg-nude-800 text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </div>

        {coupons.length === 0 ? (
          <p className="text-sm text-nude-500">Nenhum cupom salvo. Cole aqui os códigos oficiais recebidos por e-mail.</p>
        ) : (
          <div className="space-y-4">
            {[
              { key: "first", label: "🟢 Válidos na 1ª compra (novos usuários)" },
              { key: "second", label: "🔵 Válidos a partir da 2ª compra (recompras)" },
            ].map((group) => {
              const list = coupons.filter((c) => (c.purchase || "first") === group.key);
              if (!list.length) return (
                <div key={group.key}>
                  <div className="text-xs uppercase tracking-wider text-nude-700 mb-1.5">{group.label}</div>
                  <p className="text-xs text-nude-500 italic">Nenhum cupom nesta categoria.</p>
                </div>
              );
              return (
                <div key={group.key}>
                  <div className="text-xs uppercase tracking-wider text-nude-700 mb-1.5">{group.label} • {list.length}</div>
                  <div className="space-y-2">
                    {list.map((c) => (
                      <div key={c.code} className={`flex items-center justify-between gap-3 rounded-md border p-3 ${c.used ? "border-nude-200 bg-nude-50 opacity-60" : group.key === "first" ? "border-emerald-300/60 bg-emerald-50/40" : "border-blue-300/60 bg-blue-50/40"}`}>
                        <div className="min-w-0">
                          <div className="font-mono text-sm text-nude-900">{c.code}</div>
                          <div className="text-xs text-nude-500">{c.value ? `R$ ${c.value},00 • ` : ""}{new Date(c.createdAt).toLocaleString("pt-BR")} {c.used && "• Usado"}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <Button size="sm" variant="outline" onClick={() => copyCoupon(c.code)}><Copy className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setPurchase(c.code, group.key === "first" ? "second" : "first")}>
                            → {group.key === "first" ? "2ª" : "1ª"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleUsed(c.code)}>{c.used ? "Reativar" : "Usado"}</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeCoupon(c.code)} className="text-nude-500">Remover</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6 border-nude-200 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-nude-900 font-medium">
              <Search className="w-4 h-4 text-gold-600" /> Buscar cupons Emergent na internet
            </div>
            <p className="text-xs text-nude-500 mt-1 leading-relaxed">
              Varre resultados públicos (Reddit, blogs, sites de cupons) e extrai códigos candidatos.
              Nenhum código é garantido — teste no checkout antes de considerar válido.
            </p>
          </div>
          <Button onClick={searchOnline} disabled={searching} className="h-10 bg-nude-900 hover:bg-nude-800 text-white">
            {searching ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {searching ? "Buscando..." : "Buscar agora"}
          </Button>
        </div>

        {searchResult && (
          <>
            {searchResult.candidates?.length ? (
              <div className="space-y-2">
                {searchResult.candidates.map((c) => (
                  <div key={c.code} className="rounded-md border border-nude-200 p-3 bg-card">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-mono text-sm text-nude-900">{c.code}</div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => copyCoupon(c.code)}>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                        </Button>
                        <Button size="sm" onClick={() => saveCandidate(c.code)} className="bg-gold-600 hover:bg-gold-700 text-white">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                    {c.sources?.[0] && (
                      <a
                        href={c.sources[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 flex items-center gap-1 text-[11px] text-nude-500 hover:text-gold-700 truncate"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{c.sources[0].title || c.sources[0].url}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-nude-500">Nenhum código candidato encontrado nesta busca.</p>
            )}
            <p className="text-[11px] text-nude-500">
              {new Date(searchResult.generatedAt).toLocaleString("pt-BR")} • {searchResult.disclaimer}
            </p>
          </>
        )}
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
