import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Key, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { useKeyPrompt } from "@/contexts/KeyPromptContext";

export default function KeyPromptModal() {
  const { open, newKey, setNewKey, saving, hide, saveKey } = useKeyPrompt();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) hide(); }}>
      <DialogContent className="max-w-md border-amber-400/50 bg-nude-950 text-gold-50">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/20 grid place-items-center mb-3 border border-amber-500/30">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <DialogTitle className="text-center text-gold-100 text-lg">Créditos insuficientes</DialogTitle>
          <DialogDescription className="text-center text-nude-400 text-sm leading-relaxed">
            A chave Emergent atual está sem saldo para gerar imagens ou responder no chat.
            <br />
            <span className="text-gold-300 font-medium">Adicione uma nova chave abaixo para continuar usando todos os recursos.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-nude-900/60 border border-nude-800">
            <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
            <span className="text-xs text-nude-400">A chave será usada para: gerador de imagens, chat GPT, Gemini, e atendente Kênia</span>
          </div>

          <Label className="text-gold-200 text-sm">Nova chave Emergent (sk-emergent-...)</Label>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="sk-emergent-..."
            className="bg-nude-950 border-gold-900/40 text-gold-100 placeholder:text-nude-600 font-mono text-sm h-11"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={hide} disabled={saving} className="border-nude-700 text-nude-300 hover:bg-nude-800">
            Cancelar
          </Button>
          <Button onClick={saveKey} disabled={saving || !newKey.trim()} className="bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 text-nude-950 font-semibold min-w-[140px]">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Key className="w-4 h-4 mr-2" /> Salvar chave</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
