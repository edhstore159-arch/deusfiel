import React from "react";

const AREA_THEMES = {
  penal: { bg: "bg-rose-100", fg: "text-rose-600", icon: "gavel", emoji: "⚖️" },
  civel: { bg: "bg-blue-100", fg: "text-blue-600", icon: "document", emoji: "📋" },
  trabalhista: { bg: "bg-amber-100", fg: "text-amber-600", icon: "briefcase", emoji: "👷" },
  familia: { bg: "bg-purple-100", fg: "text-purple-600", icon: "heart", emoji: "👨‍👩‍👧" },
  previdenciario: { bg: "bg-teal-100", fg: "text-teal-600", icon: "shield", emoji: "🏛️" },
  tributario: { bg: "bg-emerald-100", fg: "text-emerald-600", icon: "calculator", emoji: "💰" },
  administrativo: { bg: "bg-indigo-100", fg: "text-indigo-600", icon: "building", emoji: "📜" },
  constitucional: { bg: "bg-red-100", fg: "text-red-600", icon: "book", emoji: "📕" },
  empresarial: { bg: "bg-cyan-100", fg: "text-cyan-600", icon: "store", emoji: "🏢" },
  consumidor: { bg: "bg-orange-100", fg: "text-orange-600", icon: "cart", emoji: "🛒" },
  ambiental: { bg: "bg-green-100", fg: "text-green-600", icon: "leaf", emoji: "🌿" },
  eleitoral: { bg: "bg-violet-100", fg: "text-violet-600", icon: "ballot", emoji: "🗳️" },
  internacional: { bg: "bg-sky-100", fg: "text-sky-600", icon: "globe", emoji: "🌎" },
  sucessoes: { bg: "bg-amber-100", fg: "text-amber-700", icon: "scroll", emoji: "📜" },
  bancario: { bg: "bg-lime-100", fg: "text-lime-600", icon: "bank", emoji: "🏦" },
  geral: { bg: "bg-nude-100", fg: "text-nude-500", icon: "bot", emoji: "🤖" },
};

const AREA_LABELS = {
  penal: "Penal",
  civel: "Cível",
  trabalhista: "Trabalhista",
  familia: "Família",
  previdenciario: "Previdenciário",
  tributario: "Tributário",
  administrativo: "Administrativo",
  constitucional: "Constitucional",
  empresarial: "Empresarial",
  consumidor: "Consumidor",
  ambiental: "Ambiental",
  eleitoral: "Eleitoral",
  internacional: "Internacional",
  sucessoes: "Sucessões",
  bancario: "Bancário",
  geral: "Geral",
};

function getAreaKey(area) {
  if (!area) return "geral";
  const lower = String(area).toLowerCase().trim();
  if (AREA_THEMES[lower]) return lower;
  const map = {
    "direito penal": "penal", "criminal": "penal",
    "direito civil": "civel", "cível": "civel", "civil": "civel",
    "direito bancário": "bancario", "bancário": "bancario",
    "direito do trabalho": "trabalhista", "direito trabalhista": "trabalhista",
    "direito de família": "familia", "família": "familia",
    "direito previdenciário": "previdenciario", "previdenciário": "previdenciario",
    "direito tributário": "tributario", "tributário": "tributario",
    "direito administrativo": "administrativo",
    "direito constitucional": "constitucional",
    "direito empresarial": "empresarial",
    "direito do consumidor": "consumidor", "consumidor": "consumidor",
    "direito ambiental": "ambiental",
    "direito eleitoral": "eleitoral",
    "direito internacional": "internacional",
    "direito sucessório": "sucessoes", "sucessões": "sucessoes",
  };
  return map[lower] || "geral";
}

function GavelIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 2.5L18 6l-7.5 7.5L7 6l3.5-3.5z" />
      <path d="M2 22l3-3" />
      <path d="M6.5 17.5l5 5" />
      <path d="M17 12l-8.5 8.5" />
      <path d="M14.5 10.5L22 3" />
      <rect x="2" y="20" width="20" height="2" rx="0.5" />
    </svg>
  );
}

function PersonIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
    </svg>
  );
}

function DocumentIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </svg>
  );
}

function BriefcaseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M12 12v.01" />
    </svg>
  );
}

function HeartFamilyIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <circle cx="12" cy="16" r="3" />
      <path d="M5 13c0 3.5 3 6 7 6s7-2.5 7-6" />
    </svg>
  );
}

function ShieldIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l8 4v6c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function CalculatorIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M8 10h2" />
      <path d="M14 10h2" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
      <path d="M8 18h8" />
    </svg>
  );
}

function BuildingIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
      <path d="M9 13h.01" />
      <path d="M15 13h.01" />
    </svg>
  );
}

function BookIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </svg>
  );
}

function StoreIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function CartIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function LeafIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1 7.5-3.5 11.5" />
      <path d="M11 20v-7" />
      <path d="M4 20c4-2 6-6 7-10" />
    </svg>
  );
}

function BallotIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8h.01" />
      <path d="M7 12h.01" />
      <path d="M7 16h.01" />
      <path d="M11 8h6" />
      <path d="M11 12h6" />
      <path d="M11 16h6" />
    </svg>
  );
}

function GlobeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ScrollIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10" />
      <path d="M14 13h2" />
      <path d="M14 9h2" />
      <path d="M14 5h2" />
    </svg>
  );
}

function BankIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M5 6l7-3 7 3" />
      <path d="M4 10v11" />
      <path d="M20 10v11" />
      <path d="M8 10v11" />
      <path d="M12 10v11" />
      <path d="M16 10v11" />
    </svg>
  );
}

function BotIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <path d="M8 15h.01" />
      <path d="M16 15h.01" />
      <path d="M8 19h8" />
    </svg>
  );
}

const ICON_MAP = {
  gavel: GavelIcon,
  person: PersonIcon,
  document: DocumentIcon,
  briefcase: BriefcaseIcon,
  heart: HeartFamilyIcon,
  shield: ShieldIcon,
  calculator: CalculatorIcon,
  building: BuildingIcon,
  book: BookIcon,
  store: StoreIcon,
  cart: CartIcon,
  leaf: LeafIcon,
  ballot: BallotIcon,
  globe: GlobeIcon,
  scroll: ScrollIcon,
  bank: BankIcon,
  bot: BotIcon,
};

const SIZE_MAP = {
  xs: { container: "w-8 h-8", icon: "w-4 h-4", text: "text-xs" },
  sm: { container: "w-10 h-10", icon: "w-5 h-5", text: "text-sm" },
  md: { container: "w-12 h-12", icon: "w-6 h-6", text: "text-base" },
  lg: { container: "w-14 h-14", icon: "w-7 h-7", text: "text-lg" },
  xl: { container: "w-20 h-20", icon: "w-10 h-10", text: "text-xl" },
  "2xl": { container: "w-24 h-24", icon: "w-12 h-12", text: "text-2xl" },
};

export default function AreaAvatar({ area, size = "md", name, className = "" }) {
  const key = getAreaKey(area);
  const theme = AREA_THEMES[key] || AREA_THEMES.geral;
  const sizes = SIZE_MAP[size] || SIZE_MAP.md;
  const IconComponent = ICON_MAP[theme.icon] || BotIcon;
  const initials = name
    ? name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("")
    : "";

  return (
    <div
      className={`${sizes.container} rounded-full ${theme.bg} border-2 border-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      title={name || AREA_LABELS[key] || area || "Agente"}
    >
      {initials ? (
        <span className={`${sizes.text} font-bold ${theme.fg}`}>{initials}</span>
      ) : (
        <IconComponent className={`${sizes.icon} ${theme.fg}`} />
      )}
    </div>
  );
}

export { AREA_THEMES, AREA_LABELS, getAreaKey };
