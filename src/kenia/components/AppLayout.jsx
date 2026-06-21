import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/kenia/contexts/AuthContext";
import {
  LayoutDashboard, KanbanSquare, Scale, Wallet, Sparkles,
  BarChart3, LogOut, MessageSquare, Wrench, Radio,
  CalendarDays, Settings as SettingsIcon, Combine,
  ShieldCheck, Bot, Menu, X,
} from "lucide-react";
import { Button } from "@/kenia/components/ui/button";
import { Avatar, AvatarFallback } from "@/kenia/components/ui/avatar";
import { ErrorDebugPopup } from "@/components/ErrorDebugPopup";
import FloatingVoiceOrb from "@/kenia/components/FloatingVoiceOrb";
import { api } from "@/kenia/lib/api";

const LOGO_IMG = "https://customer-assets.emergentagent.com/job_nude-gold-dashboard/artifacts/ckw9kwam_IMG-20241228-WA0003.jpg";

const NAV = [
  { to: "/app", label: "Atendimento", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/app/chat-ia", label: "Chat IA · Análise", icon: Bot, testid: "nav-chat-ia" },
  { to: "/app/admin", label: "Painel Admin · Casos", icon: ShieldCheck, testid: "nav-admin" },
  { to: "/app/secretary-tasks", label: "Tarefas Secretária", icon: MessageSquare, testid: "nav-secretary-tasks" },
  { to: "/app/agents", label: "Agentes de IA", icon: Bot, testid: "nav-agents" },
  { to: "/app/crm", label: "CRM Pipeline", icon: KanbanSquare, testid: "nav-crm" },
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays, testid: "nav-agenda" },
  { to: "/app/processes", label: "Processos", icon: Scale, testid: "nav-processes" },
  { to: "/app/finance", label: "Financeiro", icon: Wallet, testid: "nav-finance" },
  { to: "/app/creatives", label: "Criativos", icon: Sparkles, testid: "nav-creatives" },
  { to: "/app/image-fusion", label: "Fusão de Imagens", icon: Combine, testid: "nav-image-fusion" },
  { to: "/app/analytics", label: "Métricas", icon: BarChart3, testid: "nav-analytics" },
  { to: "/app/whatsapp", label: "WhatsApp", icon: MessageSquare, testid: "nav-whatsapp" },
  { to: "/app/whatsapp-logs", label: "Logs WhatsApp", icon: Radio, testid: "nav-whatsapp-logs" },
  { to: "/app/settings", label: "Configurações", icon: SettingsIcon, testid: "nav-settings" },
  { to: "/app/debug", label: "Debug Tool", icon: Wrench, testid: "nav-debug" },
];

// Prefetch lazy route chunks on hover/focus para que a navegação seja instantânea
const PREFETCH = {
  "/app": () => import("@/kenia/pages/Dashboard"),
  "/app/chat-ia": () => import("@/kenia/pages/ChatIA"),
  "/app/admin": () => import("@/kenia/pages/AdminCases"),
  "/app/secretary-tasks": () => import("@/kenia/pages/SecretaryTasks"),
  "/app/agents": () => import("@/kenia/pages/Agents"),
  "/app/crm": () => import("@/kenia/pages/CRM"),
  "/app/agenda": () => import("@/kenia/pages/Agenda"),
  "/app/processes": () => import("@/kenia/pages/Processes"),
  "/app/finance": () => import("@/kenia/pages/Finance"),
  "/app/creatives": () => import("@/kenia/pages/Creatives"),
  "/app/image-fusion": () => import("@/kenia/pages/ImageFusion"),
  "/app/analytics": () => import("@/kenia/pages/Analytics"),
  "/app/whatsapp": () => import("@/kenia/pages/WhatsAppSettings"),
  "/app/whatsapp-logs": () => import("@/kenia/pages/WhatsAppLogs"),
  "/app/settings": () => import("@/kenia/pages/Settings"),
  "/app/debug": () => import("@/kenia/pages/DebugTool"),
};
const prefetched = new Set();
const prefetch = (to) => {
  if (prefetched.has(to)) return;
  prefetched.add(to);
  const fn = PREFETCH[to];
  if (fn) fn().catch(() => prefetched.delete(to));
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deadlineCount, setDeadlineCount] = useState(0);

  // Fecha o menu ao trocar de rota (mobile)
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const loadDeadlineAlerts = async () => {
      try {
        const { data } = await api.get("/legal-deadlines");
        const now = Date.now();
        const soon = (Array.isArray(data) ? data : [])
          .filter((item) => item.status !== "done")
          .filter((item) => item.due_at && new Date(item.due_at).getTime() <= now + 7 * 24 * 60 * 60 * 1000);
        setDeadlineCount(soon.length);
      } catch {
        setDeadlineCount(0);
      }
    };
    loadDeadlineAlerts();
    const timer = setInterval(loadDeadlineAlerts, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background flex" data-testid="app-layout">
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-nude-900/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — nude/gold executive (drawer no mobile, fixo no desktop) */}
      <aside
        className={`bg-card border-r border-nude-200 flex flex-col w-64 z-50
                    fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
                    lg:static lg:translate-x-0 lg:z-auto`}
        data-testid="app-sidebar"
      >
        <div className="px-6 py-6 border-b border-nude-200 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={LOGO_IMG}
              alt="Kênia Garcia Advocacia"
              className="w-11 h-11 rounded-md object-cover shadow-sm shadow-gold-700/20 ring-1 ring-gold-300/40 shrink-0"
              data-testid="sidebar-logo"
            />
            <div className="min-w-0">
              <div className="font-serif text-xl leading-none text-nude-900 tracking-tight truncate">
                Kênia Garcia
              </div>
              <div className="overline mt-1.5 text-gold-600">Advocacia · IA</div>
            </div>
          </div>
          <button
            className="lg:hidden text-nude-600 hover:text-nude-900 p-1"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testid}
              onMouseEnter={() => prefetch(item.to)}
              onFocus={() => prefetch(item.to)}
              onTouchStart={() => prefetch(item.to)}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[11px] uppercase tracking-wide transition-all duration-200 ${
                  isActive
                    ? "bg-gold-50 text-gold-700 font-semibold nav-active-accent"
                    : "text-nude-600 hover:bg-nude-100 hover:text-nude-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 ${isActive ? "text-gold-500" : "text-nude-500"}`}
                    strokeWidth={1.6}
                  />
                  <span className="font-semibold">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-nude-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="w-9 h-9 ring-1 ring-gold-300/60">
              <AvatarFallback className="bg-gold-100 text-gold-700 text-xs font-semibold font-sans">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-nude-900 truncate" data-testid="user-name">
                {user?.name}
              </div>
              <div className="text-xs text-nude-500 truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-nude-600 hover:text-nude-900 hover:bg-nude-100 mt-1"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" strokeWidth={1.6} />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <ErrorDebugPopup />
        <FloatingVoiceOrb />
        {/* Topbar mobile com botão de menu */}
        {/* Espaçador no mobile para que o orb fixo no topo não cubra a topbar/conteúdo */}
        <div aria-hidden="true" className="lg:hidden h-24 shrink-0" />
        <header className="lg:hidden sticky top-0 z-30 h-14 px-3 flex items-center justify-between bg-card border-b border-nude-200">
          <button
            className="p-2 -ml-1 rounded-md text-nude-700 hover:bg-nude-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            data-testid="mobile-menu-btn"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Logo centralizado oculto no mobile — o orb da Kênia já ocupa o topo */}
          <div className="w-9" />
          <div className="w-9" />
        </header>

        <div className="flex-1 overflow-auto" data-app-scroll-container>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
