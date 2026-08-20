import "@/kenia/App.css";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { DebugErrorThrower } from "@/components/DebugErrorThrower";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/kenia/components/ui/sonner";
import { AuthProvider, useAuth } from "@/kenia/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import "@/kenia/storage"; // registra window.__keniaStorage e mantém persistência das secretárias

const CLONE_UNLOCK_KEY = "dstboard_unlocked";
const CLONE_PASS_HASH = "276c71a960ec3937e02ed0a0ac6a3fd298d82c41483c51e43831e842bf6b85a6";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function CloneGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem(CLONE_UNLOCK_KEY) === "1"; } catch { return false; }
  });
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    try { localStorage.setItem(CLONE_UNLOCK_KEY, "1"); } catch {}
  }, [unlocked]);

  if (unlocked) return children;

  const unlock = () => {
    try { localStorage.setItem(CLONE_UNLOCK_KEY, "1"); setUnlocked(true); } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!pass || checking) return;
    setChecking(true);
    setError("");
    try {
      const hash = await sha256(pass);
      if (hash === CLONE_PASS_HASH) return unlock();
      const { data } = await supabase.functions.invoke("check-clone-pass", { body: { password: pass } });
      if (data?.ok) return unlock();
      setError("Senha incorreta. Acesso negado.");
    } catch {
      setError("Não foi possível validar. Verifique a senha.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#05060f_70%)] text-white p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_0_40px_rgba(124,58,237,.5)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Acesso protegido</h1>
        <p className="mt-2 text-sm text-white/60">
          Este site é protegido. Digite a senha de acesso para continuar.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Senha de acesso"
            autoFocus
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={checking || !pass}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {checking ? "Verificando..." : "Desbloquear"}
          </button>
        </form>
      </div>
    </div>
  );
}


// Eager: landing + login para first paint rápido
import Landing from "@/kenia/pages/Landing";
import Login from "@/kenia/pages/Login";
import AppLayout from "@/kenia/components/AppLayout";
import ScrollToTop from "@/kenia/components/ScrollToTop";
import AdminGuard from "@/kenia/components/AdminGuard";

// Lazy: tudo o resto carrega sob demanda
// Wrapper que recarrega a página quando o chunk hash ficou obsoleto (deploy novo)
const lazyWithReload = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      const msg = String(err?.message || err || "");
      if (/Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg)) {
        const key = "__chunk_reload_at";
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 10000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw err;
    })
  );

const Dashboard = lazyWithReload(() => import("@/kenia/pages/Dashboard"));
const CRM = lazyWithReload(() => import("@/kenia/pages/CRM"));
const Processes = lazyWithReload(() => import("@/kenia/pages/Processes"));
const Finance = lazyWithReload(() => import("@/kenia/pages/Finance"));
const Creatives = lazyWithReload(() => import("@/kenia/pages/Creatives"));
const CreativesGallery = lazyWithReload(() => import("@/kenia/pages/CreativesGallery"));
const ImageFusion = lazyWithReload(() => import("@/kenia/pages/ImageFusion"));
const ViralVideoStudio = lazyWithReload(() => import("@/kenia/pages/ViralVideoStudio"));
const Analytics = lazyWithReload(() => import("@/kenia/pages/Analytics"));
const WhatsAppSettings = lazyWithReload(() => import("@/kenia/pages/WhatsAppSettings"));
const WhatsAppLogs = lazyWithReload(() => import("@/kenia/pages/WhatsAppLogs"));
const WhatsAppMedia = lazyWithReload(() => import("@/kenia/pages/WhatsAppMedia"));
const Agenda = lazyWithReload(() => import("@/kenia/pages/Agenda"));
const Onboarding = lazyWithReload(() => import("@/kenia/pages/Onboarding"));
const Consulta = lazyWithReload(() => import("@/kenia/pages/Consulta"));
const Settings = lazyWithReload(() => import("@/kenia/pages/Settings"));
const DebugTool = lazyWithReload(() => import("@/kenia/pages/DebugTool"));
const EmergentLogin = lazyWithReload(() => import("@/kenia/pages/EmergentLogin"));
const ChatIA = lazyWithReload(() => import("@/kenia/pages/ChatIA"));
const ChatMultiModelo = lazyWithReload(() => import("@/kenia/pages/ChatMultiModelo"));
const AdminCases = lazyWithReload(() => import("@/kenia/pages/AdminCases"));
const AdminSecretaria = lazyWithReload(() => import("@/kenia/pages/AdminSecretaria"));
const SecretaryTasks = lazyWithReload(() => import("@/kenia/pages/SecretaryTasks"));
const JuizVirtual = lazyWithReload(() => import("@/kenia/pages/JuizVirtual"));
const Agents = lazyWithReload(() => import("@/kenia/pages/Agents"));
const SocialConnect = lazyWithReload(() => import("@/kenia/pages/SocialConnect"));
const Dstboard = lazyWithReload(() => import("@/kenia/pages/Dstboard"));
const CTRPredictor = lazyWithReload(() => import("@/kenia/pages/CTRPredictor"));
const DocumentBuilder = lazyWithReload(() => import("@/kenia/pages/DocumentBuilder"));
const SiteBuilder = lazyWithReload(() => import("@/kenia/pages/SiteBuilder"));
const LegalTraining = lazyWithReload(() => import("@/kenia/pages/LegalTraining"));
const SecretaryMarketing = lazyWithReload(() => import("@/kenia/pages/SecretaryMarketing"));


const ResetPassword = lazy(() => import("@/kenia/pages/ResetPassword"));
const Trust = lazy(() => import("@/kenia/pages/Trust"));

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
      Carregando…
    </div>
  );
}

function App() {
  return (
    <CloneGate>
      <div className="App">
        <DebugErrorThrower />
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />


            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/consulta" element={<Consulta />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="/admin/debug" element={<Protected><DebugTool /></Protected>} />
              <Route
                element={
                  <Protected>
                    <AppLayout />
                  </Protected>
                }
              >
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/chat-ia" element={<ChatIA />} />
                <Route path="/app/chat-multi-modelo" element={<ChatMultiModelo />} />
                <Route path="/app/admin" element={<AdminGuard><AdminCases /></AdminGuard>} />
                <Route path="/app/admin/secretaria" element={<AdminGuard><AdminSecretaria /></AdminGuard>} />
                <Route path="/app/secretary-tasks" element={<SecretaryTasks />} />
                <Route path="/app/juiz-virtual" element={<JuizVirtual />} />
                <Route path="/app/agents" element={<Agents />} />
                <Route path="/app/dstboard" element={<Dstboard />} />
                <Route path="/app/ctr-predictor" element={<CTRPredictor />} />
                <Route path="/app/document-builder" element={<DocumentBuilder />} />
                <Route path="/app/site-builder" element={<SiteBuilder />} />
                <Route path="/app/legal-training" element={<LegalTraining />} />
                <Route path="/app/secretary-marketing" element={<SecretaryMarketing />} />
                
                
                <Route path="/app/onboarding" element={<Onboarding />} />
                <Route path="/app/agenda" element={<Agenda />} />
                <Route path="/app/crm" element={<CRM />} />
                <Route path="/app/processes" element={<Processes />} />
                <Route path="/app/finance" element={<Finance />} />
                <Route path="/app/creatives" element={<Creatives />} />
                <Route path="/app/creatives/gallery" element={<CreativesGallery />} />
                <Route path="/app/image-fusion" element={<ImageFusion />} />
                <Route path="/app/viral-video" element={<ViralVideoStudio />} />
                <Route path="/app/social-connect" element={<SocialConnect />} />
                <Route path="/app/analytics" element={<Analytics />} />
                <Route path="/app/whatsapp" element={<WhatsAppSettings />} />
                <Route path="/app/whatsapp-logs" element={<WhatsAppLogs />} />
                <Route path="/app/whatsapp-media" element={<WhatsAppMedia />} />
                <Route path="/app/settings" element={<AdminGuard><Settings /></AdminGuard>} />
                <Route path="/app/debug" element={<AdminGuard><DebugTool /></AdminGuard>} />
                <Route path="/app/emergent-login" element={<EmergentLogin />} />
              </Route>
            </Routes>
          </Suspense>

        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
    </CloneGate>
  );
}

export default App;
