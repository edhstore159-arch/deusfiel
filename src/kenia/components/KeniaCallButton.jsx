import { useState } from "react";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/kenia/components/ui/dialog";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function KeniaCallButton() {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState(
    "Olá, aqui é a Kenia Garcia, secretária jurídica da Dra. Kenia. Estou ligando para confirmar seu atendimento."
  );
  const [loading, setLoading] = useState(false);

  async function call() {
    const cleaned = to.replace(/[^\d+]/g, "");
    const e164 = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
    if (!/^\+\d{8,15}$/.test(e164)) {
      toast.error("Informe o número no formato internacional, ex.: +5564999881043");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("kenia-call", {
        body: { to: e164, message },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.message || data.error);
      } else {
        toast.success(`Chamada iniciada (${data.status})`);
        setOpen(false);
      }
    } catch (e) {
      toast.error(e?.message || "Falha ao iniciar chamada");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
      >
        <Phone className="h-4 w-4" /> Ligar agora
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📞 Kenia liga para um contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-nude-600">Número (com DDI/DDD)</label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="+5564999881043"
              />
            </div>
            <div>
              <label className="text-xs text-nude-600">Mensagem que a Kenia vai falar</label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={call} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? "Ligando..." : "Ligar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
