import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/kenia/lib/api";

const AuthContext = createContext(null);

function buildUser(authUser) {
  if (!authUser) return null;
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email,
    name: meta.name || meta.display_name || (authUser.email ? authUser.email.split("@")[0] : ""),
    oab: meta.oab || null,
  };
}

function buildMongoUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name || (u.email ? u.email.split("@")[0] : ""),
    oab: u.oab || null,
  };
}

const DEMO_USERS = [
  { email: "admin@kenia-garcia.com.br", password: "Kenia@Admin2026", id: "demo-admin", name: "Dr. Demo", oab: "000000/SP" },
  { email: "demo@kenia-garcia.com.br", password: "demo123", id: "demo-2", name: "Dr. Demo", oab: "000000/SP" },
];

function findDemoUser(email, password) {
  return DEMO_USERS.find((u) => u.email === email && u.password === password);
}

function isNetworkError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network error") ||
    msg.includes("transport error") ||
    msg.includes("fetch failed") ||
    !err?.status
  );
}

const SUPABASE_TIMEOUT_MS = 6000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("supabase_timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const provider = localStorage.getItem("auth_provider");
    if (provider === "mongodb" || provider === "demo") {
      const token = localStorage.getItem("lf_token");
      const stored = localStorage.getItem("lf_user");
      if (token && stored) {
        try { setUser(buildMongoUser(JSON.parse(stored))); } catch { setUser(null); }
      } else if (stored) {
        try { setUser(buildMongoUser(JSON.parse(stored))); } catch { setUser(null); }
      }
      setLoading(false);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(buildUser(session?.user ?? null));
    });
    // Valida a sessão atual no servidor. Se o session_id não existe mais
    // (session_not_found), limpa tokens locais e força novo login.
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        const code = String(error.code || error.name || "").toLowerCase();
        if (
          msg.includes("session_not_found") ||
          msg.includes("session from session_id") ||
          msg.includes("jwt") ||
          code.includes("session_not_found") ||
          error.status === 401 ||
          error.status === 403
        ) {
          try { await supabase.auth.signOut(); } catch {}
          try {
            Object.keys(localStorage)
              .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
              .forEach((k) => localStorage.removeItem(k));
          } catch {}
          setUser(null);
        }
      } else {
        setUser(buildUser(data?.user ?? null));
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  const login = async (email, password) => {
    // 1) Tentar Supabase com timeout curto
    try {
      let { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        SUPABASE_TIMEOUT_MS
      );
      if (error) throw error;
      const built = buildUser(data.user);
      setUser(built);
      localStorage.setItem("auth_provider", "supabase");
      setLoading(false);
      return built;
    } catch (supabaseErr) {
      // 2) Fallback backend MongoDB (/auth/login)
      try {
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("lf_token", data.token);
        localStorage.setItem("lf_user", JSON.stringify(data.user));
        localStorage.setItem("auth_provider", "mongodb");
        const built = buildMongoUser(data.user);
        setUser(built);
        setLoading(false);
        return built;
      } catch (mongoErr) {
        // 3) Último recurso: modo demo local com credenciais pré-configuradas
        const demo = findDemoUser(email, password);
        if (demo) {
          localStorage.setItem("auth_provider", "demo");
          localStorage.setItem("lf_user", JSON.stringify(demo));
          const built = buildMongoUser(demo);
          setUser(built);
          setLoading(false);
          return built;
        }
        throw supabaseErr;
      }
    }
  };

  const register = async (payload) => {
    const { email, password, name, oab } = payload;
    // 1) Tentar Supabase com timeout curto
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { name, oab },
          },
        }),
        SUPABASE_TIMEOUT_MS
      );
      if (error) throw error;
      if (!data.session) {
        const signIn = await supabase.auth.signInWithPassword({ email, password });
        if (signIn.error) throw signIn.error;
        const built = buildUser(signIn.data.user);
        setUser(built);
        localStorage.setItem("auth_provider", "supabase");
        setLoading(false);
        return built;
      }
      const built = buildUser(data.user);
      setUser(built);
      localStorage.setItem("auth_provider", "supabase");
      setLoading(false);
      return built;
    } catch (supabaseErr) {
      // 2) Fallback backend MongoDB (/auth/register)
      try {
        const { data } = await api.post("/auth/register", { email, password, name, oab });
        localStorage.setItem("lf_token", data.token);
        localStorage.setItem("lf_user", JSON.stringify(data.user));
        localStorage.setItem("auth_provider", "mongodb");
        const built = buildMongoUser(data.user);
        setUser(built);
        setLoading(false);
        return built;
      } catch (mongoErr) {
        // 3) Último recurso: modo demo local com credenciais pré-configuradas
        const demo = findDemoUser(email, password);
        if (demo) {
          localStorage.setItem("auth_provider", "demo");
          localStorage.setItem("lf_user", JSON.stringify(demo));
          const built = buildMongoUser(demo);
          setUser(built);
          setLoading(false);
          return built;
        }
        throw supabaseErr;
      }
    }
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_user");
    localStorage.removeItem("auth_provider");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
