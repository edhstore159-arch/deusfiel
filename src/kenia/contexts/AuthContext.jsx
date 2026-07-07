import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext({ user: null, loading: true, login: async () => {}, register: async () => {}, logout: async () => {} });

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(buildUser(session?.user ?? null));
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
