import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/kenia/components/ui/button";
import { Card } from "@/kenia/components/ui/card";

const ADMIN_PASSWORD = "DeusFiel,O8";
const STORAGE_KEY = "kenia_admin_unlocked";

function isAdminUnlocked() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AdminGuard({ children }) {
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked());
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setUnlocked(isAdminUnlocked());
  }, []);

  const tryUnlock = (e) => {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setErr("");
      setPwd("");
    } else {
      setErr("Senha incorreta.");
    }
  };

  if (unlocked) return children;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-sm border-nude-200 p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center">
            <Lock className="w-6 h-6 text-gold-700" />
          </div>
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg text-nude-900">Área Restrita</h2>
          <p className="text-sm text-nude-500 mt-1">Informe a senha de administrador para acessar.</p>
        </div>
        <form onSubmit={tryUnlock} className="space-y-3">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha"
            className="w-full border border-nude-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            autoFocus
          />
          <Button type="submit" className="w-full bg-gold-600 hover:bg-gold-700 text-white">
            Acessar
          </Button>
        </form>
        {err && <div className="text-sm text-rose-600">{err}</div>}
      </Card>
    </div>
  );
}
