import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Card } from "@/kenia/components/ui/card";
import { GraduationCap, Loader2, ImagePlus, X, Copy, FileText } from "lucide-react";
import { toast } from "sonner";

const toDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });

const pdfToImages = async (file, maxPages = 8) => {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out = [];
  const pages = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport, canvas }).promise;
    out.push(canvas.toDataURL("image/jpeg", 0.85));
  }
  return out;
};

export default function MoodleExercises() {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState("");
  const fileRef = useRef(null);

  const onFiles = async (list) => {
    if (!list || list.length === 0) return;
    const added = [];
    for (const file of Array.from(list)) {
      try {
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          const pages = await pdfToImages(file);
          added.push(...pages);
          toast.success(`PDF "${file.name}" (${pages.length} pág.) adicionado.`);
        } else if (file.type.startsWith("image/")) {
          added.push(await toDataUrl(file));
        } else {
          toast.error(`Ignorado: ${file.name} (apenas imagem/PDF).`);
        }
      } catch (e) {
        toast.error(`Falha em ${file.name}: ${e?.message || e}`);
      }
    }
    if (added.length) setImages((prev) => [...prev, ...added]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImg = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const solve = async () => {
    if (!text.trim() && images.length === 0) {
      toast.error("Cole o enunciado ou envie imagem/PDF.");
      return;
    }
    setLoading(true);
    setSolution("");
    try {
      const { data, error } = await supabase.functions.invoke("solve-exercises", {
        body: { text, images },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSolution(data?.solution || "");
      toast.success("Resolução gerada.");
    } catch (e) {
      toast.error(e?.message || "Falha ao resolver.");
    } finally {
      setLoading(false);
    }
  };

  const copySolution = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution);
    toast.success("Copiado.");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-7 h-7 text-gold-600" />
        <div>
          <h1 className="text-2xl font-serif text-nude-900">Exercícios do Moodle</h1>
          <p className="text-sm text-nude-600">
            Cole o enunciado ou envie print/PDF baixado do Moodle. A IA identifica os
            exercícios e resolve passo a passo.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-nude-700 uppercase tracking-wider">
            Enunciado (texto colado)
          </label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui o texto dos exercícios copiados do Moodle..."
            rows={7}
            className="text-sm mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-nude-700 uppercase tracking-wider">
            Prints / PDF (opcional, aceita vários)
          </label>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer?.files); }}
            className="mt-2 flex items-center gap-2 border-2 border-dashed border-nude-300 rounded-md px-4 py-3 cursor-pointer hover:bg-nude-50 w-fit"
          >
            <ImagePlus className="w-4 h-4 text-nude-500" />
            <span className="text-sm text-nude-600">Anexar imagens ou PDF</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`Página ${i + 1}`} className="w-full h-24 object-cover rounded border border-nude-200" />
                  <button
                    onClick={() => removeImg(i)}
                    className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow"
                    aria-label="Remover"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={solve} disabled={loading} className="bg-gold-600 hover:bg-gold-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {loading ? "Resolvendo..." : "Resolver exercícios"}
          </Button>
          {solution && (
            <Button variant="outline" onClick={copySolution}>
              <Copy className="w-4 h-4 mr-2" /> Copiar resolução
            </Button>
          )}
        </div>
      </Card>

      {solution && (
        <Card className="p-4">
          <pre className="whitespace-pre-wrap text-sm font-sans text-nude-900 leading-relaxed">
            {solution}
          </pre>
        </Card>
      )}
    </div>
  );
}
