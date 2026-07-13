import { useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { BookOpen, Shuffle } from "lucide-react";

const VERSES = [
  {
    ref: "Salmos 23:1",
    text: "O Senhor é o meu pastor; nada me faltará.",
    reflection:
      "Um lembrete de que somos guiados e providos. Comece o dia confiando que o essencial já está reservado para você.",
  },
  {
    ref: "Filipenses 4:13",
    text: "Posso todas as coisas naquele que me fortalece.",
    reflection:
      "A força para vencer os desafios de hoje não vem de você sozinho — é sustentada por Aquele que te capacita.",
  },
  {
    ref: "Provérbios 3:5-6",
    text: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.",
    reflection:
      "Antes de decidir, respire. Entregar o controle é abrir espaço para a direção certa se revelar.",
  },
  {
    ref: "Isaías 41:10",
    text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.",
    reflection:
      "Coragem não é ausência de medo — é caminhar sabendo que você não está sozinho na jornada.",
  },
  {
    ref: "Jeremias 29:11",
    text: "Porque eu bem sei os pensamentos que tenho a vosso respeito, pensamentos de paz e não de mal.",
    reflection:
      "Mesmo em fases confusas, existe um plano de paz sendo tecido. Persista com esperança.",
  },
  {
    ref: "Romanos 8:28",
    text: "Todas as coisas cooperam para o bem daqueles que amam a Deus.",
    reflection:
      "Nada se perde. Até o que parece atraso está sendo usado para construir algo maior em você.",
  },
  {
    ref: "Josué 1:9",
    text: "Sê forte e corajoso; não temas, nem te espantes, porque o Senhor teu Deus é contigo.",
    reflection:
      "Aja com coragem hoje. A presença que te acompanha é maior que qualquer obstáculo à frente.",
  },
  {
    ref: "Mateus 11:28",
    text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.",
    reflection:
      "Descansar também é ato de fé. Coloque o peso onde ele pode ser sustentado.",
  },
  {
    ref: "Salmos 46:10",
    text: "Aquietai-vos e sabei que eu sou Deus.",
    reflection:
      "No silêncio, a clareza aparece. Pause um instante antes de seguir adiante.",
  },
  {
    ref: "2 Timóteo 1:7",
    text: "Deus não nos deu espírito de temor, mas de fortaleza, de amor e de moderação.",
    reflection:
      "Você foi equipado com firmeza, empatia e equilíbrio — use os três hoje.",
  },
];

export default function BibleVerseBox() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * VERSES.length));
  const verse = VERSES[index];

  return (
    <Card className="p-5 border-gold-300/50 bg-gradient-to-br from-nude-50 to-gold-50/40 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gold-700">
          <BookOpen className="w-4 h-4" />
          <span className="overline text-xs tracking-wider">Palavra do dia</span>
        </div>
        <button
          type="button"
          onClick={() => setIndex(Math.floor(Math.random() * VERSES.length))}
          className="flex items-center gap-1 text-xs text-gold-700 hover:text-gold-800"
          aria-label="Sortear outro versículo"
        >
          <Shuffle className="w-3.5 h-3.5" /> Outro
        </button>
      </div>

      <label className="block text-[11px] uppercase tracking-wider text-nude-500 mb-1">
        Escolha um versículo
      </label>
      <select
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        className="w-full h-10 rounded-md border border-nude-200 bg-card px-2 text-sm text-nude-900 focus-visible:ring-gold-400 mb-3"
      >
        {VERSES.map((v, i) => (
          <option key={v.ref} value={i}>{v.ref}</option>
        ))}
      </select>

      <p className="font-serif italic text-nude-900 leading-relaxed">"{verse.text}"</p>
      <p className="overline text-gold-700 mt-1.5 text-xs">{verse.ref}</p>
      <div className="gold-divider my-3" />
      <p className="text-sm text-nude-700 leading-relaxed">{verse.reflection}</p>
    </Card>
  );
}
