import "@/kenia/App.css";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/kenia/components/ui/sonner";
import { AuthProvider, useAuth } from "@/kenia/contexts/AuthContext";
import { DebugErrorThrower } from "@/components/DebugErrorThrower";

import Landing from "@/kenia/pages/Landing";
import Login from "@/kenia/pages/Login";
import Dashboard from "@/kenia/pages/Dashboard";
import CRM from "@/kenia/pages/CRM";
import Processes from "@/kenia/pages/Processes";
import Finance from "@/kenia/pages/Finance";
import Creatives from "@/kenia/pages/Creatives";
import ImageFusion from "@/kenia/pages/ImageFusion";
import Analytics from "@/kenia/pages/Analytics";
import WhatsAppSettings from "@/kenia/pages/WhatsAppSettings";
import WhatsAppConnection from "@/kenia/pages/WhatsAppConnection";
import WhatsAppLogs from "@/kenia/pages/WhatsAppLogs";
import Agenda from "@/kenia/pages/Agenda";
import Onboarding from "@/kenia/pages/Onboarding";
import Consulta from "@/kenia/pages/Consulta";
import Settings from "@/kenia/pages/Settings";
import DebugTool from "@/kenia/pages/DebugTool";
import ChatIA from "@/kenia/pages/ChatIA";
import AdminCases from "@/kenia/pages/AdminCases";
import ResetPassword from "@/kenia/pages/ResetPassword";
import AIBuilder from "@/kenia/pages/AIBuilder";
import Agents from "@/kenia/pages/Agents";
import ChatMultiModelo from "@/kenia/pages/ChatMultiModelo";
import CompetitorAnalysis from "@/kenia/pages/CompetitorAnalysis";
import CreativesGallery from "@/kenia/pages/CreativesGallery";
import DocumentBuilder from "@/kenia/pages/DocumentBuilder";
import Dstboard from "@/kenia/pages/Dstboard";
import EmergentLogin from "@/kenia/pages/EmergentLogin";
import JuizVirtual from "@/kenia/pages/JuizVirtual";
import LegalTraining from "@/kenia/pages/LegalTraining";
import SecretaryMarketing from "@/kenia/pages/SecretaryMarketing";
import SecretaryTasks from "@/kenia/pages/SecretaryTasks";
import SiteBuilder from "@/kenia/pages/SiteBuilder";
import SocialConnect from "@/kenia/pages/SocialConnect";
import Trust from "@/kenia/pages/Trust";
import ViralVideoStudio from "@/kenia/pages/ViralVideoStudio";
import WhatsAppMedia from "@/kenia/pages/WhatsAppMedia";
import AppLayout from "@/kenia/components/AppLayout";
import ScrollToTop from "@/kenia/components/ScrollToTop";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      {/* DebugErrorThrower DEVE ficar fora de qualquer ErrorBoundary/Suspense */}
      <DebugErrorThrower />
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />

          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/consulta" element={<Consulta />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route path="/app/ai-builder" element={<AIBuilder />} />
              <Route path="/app/admin" element={<AdminCases />} />
              <Route path="/app/onboarding" element={<Onboarding />} />
              <Route path="/app/agenda" element={<Agenda />} />
              <Route path="/app/crm" element={<CRM />} />
              <Route path="/app/processes" element={<Processes />} />
              <Route path="/app/finance" element={<Finance />} />
              <Route path="/app/creatives" element={<Creatives />} />
              <Route path="/app/image-fusion" element={<ImageFusion />} />
              <Route path="/app/analytics" element={<Analytics />} />
              <Route path="/app/whatsapp" element={<WhatsAppSettings />} />
              <Route path="/app/whatsapp-connection" element={<WhatsAppConnection />} />
              <Route path="/app/whatsapp-logs" element={<WhatsAppLogs />} />
              <Route path="/app/settings" element={<Settings />} />
              <Route path="/app/debug" element={<DebugTool />} />
              <Route path="/app/agents" element={<Agents />} />
              <Route path="/app/chat-multi-modelo" element={<ChatMultiModelo />} />
              <Route path="/app/competitor-analysis" element={<CompetitorAnalysis />} />
              <Route path="/app/creatives-gallery" element={<CreativesGallery />} />
              <Route path="/app/document-builder" element={<DocumentBuilder />} />
              <Route path="/app/dstboard" element={<Dstboard />} />
              <Route path="/app/emergent-login" element={<EmergentLogin />} />
              <Route path="/app/juiz-virtual" element={<JuizVirtual />} />
              <Route path="/app/legal-training" element={<LegalTraining />} />
              <Route path="/app/secretary-marketing" element={<SecretaryMarketing />} />
              <Route path="/app/secretary-tasks" element={<SecretaryTasks />} />
              <Route path="/app/site-builder" element={<SiteBuilder />} />
              <Route path="/app/social-connect" element={<SocialConnect />} />
              <Route path="/app/trust" element={<Trust />} />
              <Route path="/app/viral-video-studio" element={<ViralVideoStudio />} />
              <Route path="/app/whatsapp-media" element={<WhatsAppMedia />} />
            </Route>
          </Routes>

        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
