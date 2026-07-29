// Stub for Lovable cloud auth - not available outside Lovable platform

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft" | "lovable", opts?: SignInOptions) => {
      // On Render deployment, fall back to Supabase OAuth directly
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider === "lovable" ? "google" : provider,
        options: {
          redirectTo: opts?.redirect_uri || window.location.origin + "/app",
        },
      });
      return { error, tokens: data };
    },
  },
};
