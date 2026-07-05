import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Card } from "@/kenia/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import { NotebookPen, Loader2, Download, ImagePlus, X, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

const VISMO_STUDIO_PROMPT = `Crie uma imagem hiper-realista, vista de cima, de uma folha de papel sulfite branca, levemente amassada, sobre uma mesa de madeira clara (fundo desfocado, luz natural suave vindo da esquerda, sombras sutis).

A folha contém a RESOLUÇÃO MANUSCRITA COMPLETA de uma questão de matemática, escrita por um estudante universitário com caneta esferográfica azul (ou preta), em letra cursiva natural, levemente inclinada, com pequenas imperfeições humanas e uma ou outra rasura discreta.

REGRAS OBRIGATÓRIAS:
- 100% manuscrito — NENHUMA fonte digital, NENHUMA tipografia.
- Preserve símbolos matemáticos reais: ∫, ∬, ∮, dA, dx, dy, dz, π, θ, Σ, √, ≤, ≥, →, sen, cos, tg, ln, lim.
- Numere os itens (1., 2., 3., a), b), c)).
- Mostre o passo a passo COMPLETO: enunciado resumido → identificação do método → substituições → cálculo → resultado final destacado (com caixa ou sublinhado).
- Se útil, inclua um pequeno esboço/gráfico à mão ao lado.
- Matematicamente coerente e correto — jamais símbolos aleatórios.
- SEM marca d'água, SEM texto impresso extra, SEM legendas digitais.

QUESTÃO A RESOLVER (transcreva o enunciado no topo e resolva abaixo, passo a passo):
{QUESTAO}`;

export default function NotebookGenerator() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [refImage, setRefImage] = useState(null);
  const fileRef = useRef(null);

  const toDataUrl = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });

  const pdfFirstPageToDataUrl = async (file) => {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport, canvas }).promise;
    return canvas.toDataURL("image/png");
  };

  const onFile = async (file) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isImage && !isPdf) {
      toast.error("Envie uma imagem ou PDF.");
      return;
    }
    try {
      const url = isPdf ? await pdfFirstPageToDataUrl(file) : await toDataUrl(file);
      setRefImage(url);
      if (isPdf) toast.success("PDF convertido (página 1) para referência.");
    } catch (e) {
      toast.error(`Falha ao ler o arquivo: ${e?.message || e}`);
    }
  };

  const generate = async () => {
    if (!text.trim()) {
      toast.error("Digite algum texto primeiro.");
      return;
    }
    setLoading(true);
    setImage(null);
    try {
      const { data, error } = await supabase.functions.invoke("notebook-image", {
        body: { text, imageUrl: refImage || undefined },
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

        <div>
          <label className="text-xs font-semibold text-nude-700 uppercase tracking-wider">
            Imagem de referência (opcional)
          </label>
          <p className="text-xs text-nude-500 mb-2">
            Anexe uma foto da sua letra/lápis para o modelo copiar o estilo e a cor.
          </p>
          {refImage ? (
            <div className="relative inline-block">
              <img src={refImage} alt="Referência" className="max-h-40 rounded border border-nude-200" />
              <button
                onClick={() => { setRefImage(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow"
                aria-label="Remover imagem"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer?.files?.[0]); }}
              className="flex items-center gap-2 border-2 border-dashed border-nude-300 rounded-md px-4 py-3 cursor-pointer hover:bg-nude-50 w-fit"
            >
              <ImagePlus className="w-4 h-4 text-nude-500" />
              <span className="text-sm text-nude-600">Anexar imagem ou PDF</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

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
