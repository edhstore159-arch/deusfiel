import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const built = buildUser(data.user);
    setUser(built);
    return built;
  };

  const register = async (payload) => {
    const { email, password, name, oab } = payload;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { name, oab },
      },
    });
    if (error) throw error;
    if (!data.session) {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (signIn.error) throw signIn.error;
      const built = buildUser(signIn.data.user);
      setUser(built);
      return built;
    }
    const built = buildUser(data.user);
    setUser(built);
    return built;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
