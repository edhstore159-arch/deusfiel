import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Card } from "@/kenia/components/ui/card";
import { NotebookPen, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

export default function NotebookGenerator() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);

  const generate = async () => {
    if (!text.trim()) {
      toast.error("Digite algum texto primeiro.");
      return;
    }
    setLoading(true);
    setImage(null);
    try {
      const { data, error } = await supabase.functions.invoke("notebook-image", {
        body: { text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.image) throw new Error("Sem imagem retornada");
      setImage(data.image);
    } catch (e) {
      toast.error(e?.message || "Falha ao gerar imagem");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `caderno-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <NotebookPen className="w-7 h-7 text-gold-600" />
        <div>
          <h1 className="text-2xl font-serif text-nude-900">Gerador de Caderno</h1>
          <p className="text-sm text-nude-600">
            Transforma seu texto em uma imagem de caderno escrito à mão.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite o texto que deseja transformar em escrita à mão..."
          rows={6}
          className="text-sm"
        />
        <div className="flex gap-2">
          <Button onClick={generate} disabled={loading} className="bg-gold-600 hover:bg-gold-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <NotebookPen className="w-4 h-4 mr-2" />}
            {loading ? "Gerando..." : "Gerar imagem"}
          </Button>
          {image && (
            <Button variant="outline" onClick={download}>
              <Download className="w-4 h-4 mr-2" /> Baixar
            </Button>
          )}
        </div>
      </Card>

      {image && (
        <Card className="p-4">
          <img src={image} alt="Texto escrito à mão em caderno" className="w-full rounded-md" />
        </Card>
      )}
    </div>
  );
}
