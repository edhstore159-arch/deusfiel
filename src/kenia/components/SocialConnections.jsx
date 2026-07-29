import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Badge } from "@/kenia/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/kenia/components/ui/dialog";
import {
  Instagram, Facebook, Linkedin, Youtube, Twitter, Music2,
  Image as ImageIcon, MessageCircle, Check, Plug, Loader2,
  ExternalLink, Shield, RefreshCcw, CheckCircle2,
  XCircle, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const SOCIAL_NETWORKS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "from-fuchsia-500 to-orange-400", api: "Meta Graph API", scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"], real: true },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "from-blue-600 to-blue-400", api: "Meta Graph API", scopes: ["pages_manage_posts", "pages_read_engagement"], real: false },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "from-sky-700 to-sky-500", api: "LinkedIn Marketing API", scopes: ["w_member_social", "r_liteprofile"], real: false },
  { id: "tiktok", label: "TikTok", icon: Music2, color: "from-zinc-900 to-rose-500", api: "TikTok Marketing API", scopes: ["video.upload", "video.publish"], real: false },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "from-red-600 to-red-400", api: "Google Data API v3", scopes: ["youtube.upload", "youtube.force-ssl"], real: false },
  { id: "x", label: "X (Twitter)", icon: Twitter, color: "from-zinc-900 to-zinc-600", api: "X API v2", scopes: ["tweet.write", "users.read"], real: false },
  { id: "pinterest", label: "Pinterest", icon: ImageIcon, color: "from-rose-600 to-rose-400", api: "Pinterest API", scopes: ["pins:write", "boards:read"], real: false },
  { id: "whatsapp", label: "WhatsApp Business", icon: MessageCircle, color: "from-emerald-600 to-emerald-400", api: "WhatsApp Business API", scopes: ["whatsapp_business_messaging"], real: false },
];

export default function SocialConnections({ compact = false }) {
  const [igAccount, setIgAccount] = useState(null);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [loading, setLoading] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ account_name: "", account_handle: "" });
  const [editOpen, setEditOpen] = useState(false);

  const loadIgAccount = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("instagram-list-media", { body: {} });
      if (error) throw error;
      if (data?.connected && data?.account) {
        setIgAccount(data.account);
      } else {
        setIgAccount(null);
      }
    } catch {
      setIgAccount(null);
    }
  }, []);

  const loadSocialAccounts = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) { setSocialAccounts([]); return; }
    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", auth.user.id);
    setSocialAccounts(data || []);
  }, []);

  const load = useCallback(async () => {
    await Promise.all([loadIgAccount(), loadSocialAccounts()]);
  }, [loadIgAccount, loadSocialAccounts]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function onMsg(ev) {
      if (ev?.data?.type === "instagram-connected") {
        toast.success("Instagram conectado com sucesso!");
        load();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [load]);

  const isInstagramConnected = Boolean(igAccount);
  const isOtherConnected = (id) => socialAccounts.some((a) => a.platform === id && a.is_connected);

  const connectInstagram = async () => {
    setLoading("instagram");
    try {
      const { data, error } = await supabase.functions.invoke("instagram-oauth-start", { body: {} });
      if (error) throw error;
      if (!data?.url) throw new Error("URL OAuth indisponível");
      window.open(data.url, "ig_oauth", "width=600,height=720");
      toast.message("Abrindo Facebook/Instagram para autorização…");
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("INSTAGRAM_APP_ID")) {
        toast.error("Configure INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET nos secrets do Supabase.");
      } else {
        toast.error("Falha ao iniciar conexão: " + msg);
      }
    } finally {
      setLoading(null);
    }
  };

  const disconnectInstagram = async () => {
    if (!confirm("Desconectar Instagram? O agendamento automático será desativado.")) return;
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      await supabase.from("instagram_accounts").delete().eq("user_id", u.user.id);
      setIgAccount(null);
      toast.success("Instagram desconectado");
    } catch (e) {
      toast.error("Falha ao desconectar: " + String(e?.message || e));
    }
  };

  const connectGeneric = async (net) => {
    setLoading(net.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) { toast.error("Faça login primeiro"); return; }
      const existing = socialAccounts.find((a) => a.platform === net.id);
      if (existing) {
        await supabase
          .from("social_accounts")
          .update({ is_connected: true })
          .eq("id", existing.id);
      } else {
        await supabase.from("social_accounts").insert({
          user_id: auth.user.id,
          platform: net.id,
          account_name: net.label,
          account_handle: `@${net.label.toLowerCase().replace(/\s+/g, "")}`,
          is_connected: true,
        });
      }
      toast.success(`${net.label} conectado`);
      loadSocialAccounts();
    } catch (e) {
      toast.error(`Erro: ${e.message || e}`);
    } finally {
      setLoading(null);
    }
  };

  const disconnectGeneric = async (net) => {
    const existing = socialAccounts.find((a) => a.platform === net.id);
    if (!existing) return;
    if (!confirm(`Desconectar ${net.label}?`)) return;
    await supabase.from("social_accounts").delete().eq("id", existing.id);
    toast.success(`${net.label} desconectado`);
    loadSocialAccounts();
  };

  const openEdit = (net) => {
    const existing = socialAccounts.find((a) => a.platform === net.id);
    if (!existing) return;
    setEditTarget(net);
    setForm({ account_name: existing.account_name || "", account_handle: existing.account_handle || "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const existing = socialAccounts.find((a) => a.platform === editTarget.id);
    if (!existing) return;
    try {
      await supabase
        .from("social_accounts")
        .update({ account_name: form.account_name, account_handle: form.account_handle })
        .eq("id", existing.id);
      toast.success("Conta atualizada");
      setEditOpen(false);
      loadSocialAccounts();
    } catch (e) {
      toast.error("Erro: " + (e.message || e));
    }
  };

  const connectedCount = (isInstagramConnected ? 1 : 0) + SOCIAL_NETWORKS.filter((n) => n.id !== "instagram" && isOtherConnected(n.id)).length;

  return (
    <>
      <Card className={`p-5 border-nude-200`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-100 grid place-items-center">
              <Plug className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <div className="font-display font-semibold text-sm text-nude-900">Conectar Redes Sociais</div>
              <div className="text-[11px] text-nude-500">
                Autorize o acesso via OAuth para agendar e publicar automaticamente
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connectedCount > 0 ? "bg-emerald-500" : "bg-nude-300"}`} />
            {connectedCount}/{SOCIAL_NETWORKS.length} ativas
          </Badge>
        </div>

        {/* Connected accounts summary */}
        {connectedCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {isInstagramConnected && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-fuchsia-500 to-orange-400 grid place-items-center">
                  <Instagram className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-800">@{igAccount.ig_username}</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            )}
            {SOCIAL_NETWORKS.filter((n) => n.id !== "instagram" && isOtherConnected(n.id)).map((net) => {
              const Icon = net.icon;
              const acc = socialAccounts.find((a) => a.platform === net.id);
              return (
                <div key={net.id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                  <div className={`w-5 h-5 rounded-sm bg-gradient-to-br ${net.color} grid place-items-center`}>
                    <Icon className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-emerald-800">{acc?.account_handle || net.label}</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                </div>
              );
            })}
          </div>
        )}

        {/* Network grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SOCIAL_NETWORKS.map((net) => {
            const Icon = net.icon;
            const isLoading = loading === net.id;
            const connected = net.id === "instagram" ? isInstagramConnected : isOtherConnected(net.id);

            return (
              <div
                key={net.id}
                className={`relative rounded-xl border transition-all ${
                  connected
                    ? "border-emerald-200 bg-emerald-50/30 shadow-sm"
                    : "border-nude-200 bg-white hover:border-nude-300 hover:shadow-sm"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${net.color} grid place-items-center text-white shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-nude-900">{net.label}</span>
                        {connected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-[10px] text-nude-500 mt-0.5">{net.api}</div>
                    </div>
                  </div>

                  {connected ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
                      <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold mb-0.5">Conectado</div>
                      {net.id === "instagram" && igAccount ? (
                        <>
                          <div className="text-xs font-medium text-emerald-800 truncate">@{igAccount.ig_username}</div>
                          <div className="text-[10px] text-emerald-600 truncate">{igAccount.page_name}</div>
                        </>
                      ) : (
                        <div className="text-xs font-medium text-emerald-800">{net.label} • Conta ativa</div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-nude-50 border border-nude-200 rounded-lg px-3 py-2 mb-3">
                      <div className="text-[10px] text-nude-500 uppercase tracking-wider font-semibold mb-0.5">Não conectado</div>
                      <div className="text-[10px] text-nude-500">
                        {net.real ? "Clique abaixo para autorizar via OAuth" : "Conecte sua conta manualmente"}
                      </div>
                    </div>
                  )}

                  {/* Permissions */}
                  <div className="mb-3">
                    <div className="text-[9px] text-nude-400 uppercase tracking-wider mb-1">Permissões</div>
                    <div className="flex flex-wrap gap-1">
                      {net.scopes.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[8px] px-1.5 py-0 h-4">{s}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {connected ? (
                      <>
                        {net.id === "instagram" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-[11px] gap-1.5"
                            onClick={connectInstagram}
                            disabled={isLoading}
                          >
                            <RefreshCcw className="w-3 h-3" /> Reconectar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-[11px] gap-1.5"
                            onClick={() => openEdit(net)}
                          >
                            Editar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => net.id === "instagram" ? disconnectInstagram() : disconnectGeneric(net)}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-[11px] bg-nude-900 hover:bg-nude-800 gap-1.5"
                        onClick={() => net.id === "instagram" ? connectInstagram() : connectGeneric(net)}
                        disabled={isLoading}
                        data-testid={`connect-${net.id}`}
                      >
                        {isLoading ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Conectando…</>
                        ) : (
                          <><ExternalLink className="w-3 h-3" /> {net.real ? "Conectar via OAuth" : "Conectar"}</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-4 flex items-start gap-2 bg-gold-50 border border-gold-200 rounded-lg px-4 py-3">
          <Shield className="w-4 h-4 text-gold-600 mt-0.5 shrink-0" />
          <div className="text-[11px] text-gold-800 leading-relaxed">
            <strong>Instagram:</strong> Conexão real via Meta Graph API OAuth. Nós não armazenamos senhas — apenas tokens de acesso revogáveis.
            <strong> Outras redes:</strong> Registre a conta para agendamento. O OAuth oficial será ativado quando as API keys forem configuradas.
          </div>
        </div>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editTarget && <editTarget.icon className="w-4 h-4" />} Editar {editTarget?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label>Nome da conta</Label>
              <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
            </div>
            <div>
              <Label>Usuário / handle</Label>
              <Input value={form.account_handle} onChange={(e) => setForm({ ...form, account_handle: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} className="bg-nude-900 hover:bg-nude-800">
              <Plug className="w-3.5 h-3.5 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
