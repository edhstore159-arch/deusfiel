import { Link } from "react-router-dom";
import { Trophy, Flame, Calendar, ArrowRight, TrendingUp } from "lucide-react";
import SEO from "@/components/SEO";

const liveScores = [
  { league: "PREMIER LEAGUE", home: "Arsenal", away: "Chelsea", scoreH: 2, scoreA: 1, status: "78'" },
  { league: "LA LIGA", home: "Barcelona", away: "Real Madrid", scoreH: 1, scoreA: 1, status: "LIVE" },
  { league: "NBA", home: "Lakers", away: "Celtics", scoreH: 102, scoreA: 98, status: "Q4" },
  { league: "SERIE A", home: "Inter", away: "Juventus", scoreH: 0, scoreA: 0, status: "45'" },
];

const news = [
  {
    tag: "FOOTBALL",
    title: "Champions League: noite histórica nas semifinais",
    excerpt: "Gols nos minutos finais decidem confronto e definem finalista após 12 anos.",
    time: "há 2h",
  },
  {
    tag: "BASKETBALL",
    title: "Estrela da NBA quebra recorde de pontos da temporada",
    excerpt: "Com 61 pontos, jogador entra para a história da franquia em vitória decisiva.",
    time: "há 4h",
  },
  {
    tag: "F1",
    title: "GP de Mônaco: pole position dramática nos últimos segundos",
    excerpt: "Volta perfeita garante primeira fila e promete corrida eletrizante no domingo.",
    time: "há 6h",
  },
  {
    tag: "TENNIS",
    title: "Roland Garros: virada épica garante vaga na final",
    excerpt: "Após estar dois sets atrás, tenista reage e conquista vaga inédita.",
    time: "há 8h",
  },
];

const standings = [
  { pos: 1, team: "Manchester City", pts: 78 },
  { pos: 2, team: "Arsenal", pts: 75 },
  { pos: 3, team: "Liverpool", pts: 71 },
  { pos: 4, team: "Aston Villa", pts: 65 },
  { pos: 5, team: "Tottenham", pts: 60 },
];

const Index = () => {
  return (
    <>
      <SEO
        title="ProSport — Notícias, Resultados e Análises Esportivas"
        description="Cobertura completa do esporte: futebol, basquete, F1, tênis. Resultados ao vivo, classificações e análises em tempo real."
        canonicalUrl="/"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              PRO<span className="text-primary">SPORT</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {["Futebol", "Basquete", "F1", "Tênis", "MMA"].map((item) => (
              <a key={item} href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                {item}
              </a>
            ))}
          </nav>
          <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            Assinar
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Hero */}
        <section className="py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5" /> Em Alta
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              A emoção do esporte, <span className="text-primary">em tempo real.</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl">
              Resultados ao vivo, análises de especialistas e tudo o que importa nas principais ligas do mundo.
            </p>
            <div className="flex gap-3 pt-2">
              <button className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                Ver ao vivo <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-5 py-3 rounded-md border border-border font-semibold hover:bg-secondary transition-colors">
                Calendário
              </button>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-border bg-card aspect-[4/3] relative">
            <img
              src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1200&q=80"
              alt="Estádio de futebol iluminado"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <span className="text-xs uppercase tracking-widest text-accent font-bold">Destaque</span>
              <p className="text-xl md:text-2xl font-bold mt-1">Final da Champions League hoje, 16h</p>
            </div>
          </div>
        </section>

        {/* Live Scores Strip */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Placar ao vivo</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {liveScores.map((m, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                  <span>{m.league}</span>
                  <span className="text-destructive font-bold">{m.status}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{m.home}</span>
                    <span className="text-lg font-bold">{m.scoreH}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{m.away}</span>
                    <span className="text-lg font-bold">{m.scoreA}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* News + Standings */}
        <section className="grid lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Últimas Notícias
            </h2>
            <div className="space-y-4">
              {news.map((n, i) => (
                <article key={i} className="group rounded-lg border border-border bg-card p-5 hover:border-primary transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase tracking-wider">
                      {n.tag}
                    </span>
                    <span className="text-muted-foreground">{n.time}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                    {n.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{n.excerpt}</p>
                </article>
              ))}
            </div>
          </div>

          <aside>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" /> Classificação
            </h2>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-2 bg-secondary text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Premier League
              </div>
              <ul className="divide-y divide-border">
                {standings.map((s) => (
                  <li key={s.pos} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-sm font-bold ${s.pos <= 4 ? "text-primary" : "text-muted-foreground"}`}>
                        {s.pos}
                      </span>
                      <span className="font-medium text-sm">{s.team}</span>
                    </div>
                    <span className="font-bold text-sm">{s.pts}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-bold">PROSPORT</span>
            <span className="text-xs text-muted-foreground ml-2">© 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Sobre</a>
            <a href="#" className="hover:text-foreground">Contato</a>
            <a href="#" className="hover:text-foreground">Privacidade</a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Index;
