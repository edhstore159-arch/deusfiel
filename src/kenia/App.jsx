import "@/kenia/App.css";
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/kenia/components/ui/sonner";
import { AuthProvider, useAuth } from "@/kenia/contexts/AuthContext";
import "@/kenia/storage"; // registra window.__keniaStorage e mantém persistência das secretárias
import ErrorDebugPopup from "@/components/ErrorDebugPopup";

// Eager: landing + login para first paint rápido
import Landing from "@/kenia/pages/Landing";
import Login from "@/kenia/pages/Login";
import AppLayout from "@/kenia/components/AppLayout";
import ScrollToTop from "@/kenia/components/ScrollToTop";

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
const Agenda = lazyWithReload(() => import("@/kenia/pages/Agenda"));
const Onboarding = lazyWithReload(() => import("@/kenia/pages/Onboarding"));
const Consulta = lazyWithReload(() => import("@/kenia/pages/Consulta"));
const Settings = lazyWithReload(() => import("@/kenia/pages/Settings"));
const DebugTool = lazyWithReload(() => import("@/kenia/pages/DebugTool"));
const EmergentLogin = lazyWithReload(() => import("@/kenia/pages/EmergentLogin"));
const ChatIA = lazyWithReload(() => import("@/kenia/pages/ChatIA"));
const NotebookGenerator = lazyWithReload(() => import("@/kenia/pages/NotebookGenerator"));
const AdminCases = lazyWithReload(() => import("@/kenia/pages/AdminCases"));
const SecretaryTasks = lazyWithReload(() => import("@/kenia/pages/SecretaryTasks"));


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
    <div className="App">
      <AuthProvider>
        <ErrorDebugPopup />
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
                <Route path="/app/admin" element={<AdminCases />} />
                <Route path="/app/secretary-tasks" element={<SecretaryTasks />} />
                
                <Route path="/app/onboarding" element={<Onboarding />} />
                <Route path="/app/agenda" element={<Agenda />} />
                <Route path="/app/crm" element={<CRM />} />
                <Route path="/app/processes" element={<Processes />} />
                <Route path="/app/finance" element={<Finance />} />
                <Route path="/app/creatives" element={<Creatives />} />
                <Route path="/app/creatives/gallery" element={<CreativesGallery />} />
                <Route path="/app/image-fusion" element={<ImageFusion />} />
                <Route path="/app/viral-video" element={<ViralVideoStudio />} />
                <Route path="/app/analytics" element={<Analytics />} />
                <Route path="/app/whatsapp" element={<WhatsAppSettings />} />
                <Route path="/app/whatsapp-logs" element={<WhatsAppLogs />} />
                <Route path="/app/settings" element={<Settings />} />
                <Route path="/app/debug" element={<DebugTool />} />
                <Route path="/app/notebook-generator" element={<NotebookGenerator />} />
                <Route path="/app/emergent-login" element={<EmergentLogin />} />
              </Route>
            </Routes>
          </Suspense>

        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
