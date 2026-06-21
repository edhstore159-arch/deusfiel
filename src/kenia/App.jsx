import "@/kenia/App.css";
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/kenia/components/ui/sonner";
import { AuthProvider, useAuth } from "@/kenia/contexts/AuthContext";
import { DebugErrorThrower } from "@/components/DebugErrorThrower";

// Eager: landing + login para first paint rápido
import Landing from "@/kenia/pages/Landing";
import Login from "@/kenia/pages/Login";
import AppLayout from "@/kenia/components/AppLayout";
import ScrollToTop from "@/kenia/components/ScrollToTop";

// Lazy: tudo o resto carrega sob demanda
const Dashboard = lazy(() => import("@/kenia/pages/Dashboard"));
const CRM = lazy(() => import("@/kenia/pages/CRM"));
const Processes = lazy(() => import("@/kenia/pages/Processes"));
const Finance = lazy(() => import("@/kenia/pages/Finance"));
const Creatives = lazy(() => import("@/kenia/pages/Creatives"));
const ImageFusion = lazy(() => import("@/kenia/pages/ImageFusion"));
const Analytics = lazy(() => import("@/kenia/pages/Analytics"));
const WhatsAppSettings = lazy(() => import("@/kenia/pages/WhatsAppSettings"));
const WhatsAppLogs = lazy(() => import("@/kenia/pages/WhatsAppLogs"));
const Agenda = lazy(() => import("@/kenia/pages/Agenda"));
const Onboarding = lazy(() => import("@/kenia/pages/Onboarding"));
const Consulta = lazy(() => import("@/kenia/pages/Consulta"));
const Settings = lazy(() => import("@/kenia/pages/Settings"));
const DebugTool = lazy(() => import("@/kenia/pages/DebugTool"));
const ChatIA = lazy(() => import("@/kenia/pages/ChatIA"));
const AdminCases = lazy(() => import("@/kenia/pages/AdminCases"));
const SecretaryTasks = lazy(() => import("@/kenia/pages/SecretaryTasks"));
const Agents = lazy(() => import("@/kenia/pages/Agents"));
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
      {/* Captura instruções de debug sem interromper a experiência do app */}
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
                <Route path="/app/admin" element={<AdminCases />} />
                <Route path="/app/secretary-tasks" element={<SecretaryTasks />} />
                <Route path="/app/agents" element={<Agents />} />
                <Route path="/app/onboarding" element={<Onboarding />} />
                <Route path="/app/agenda" element={<Agenda />} />
                <Route path="/app/crm" element={<CRM />} />
                <Route path="/app/processes" element={<Processes />} />
                <Route path="/app/finance" element={<Finance />} />
                <Route path="/app/creatives" element={<Creatives />} />
                <Route path="/app/image-fusion" element={<ImageFusion />} />
                <Route path="/app/analytics" element={<Analytics />} />
                <Route path="/app/whatsapp" element={<WhatsAppSettings />} />
                <Route path="/app/whatsapp-logs" element={<WhatsAppLogs />} />
                <Route path="/app/settings" element={<Settings />} />
                <Route path="/app/debug" element={<DebugTool />} />
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
