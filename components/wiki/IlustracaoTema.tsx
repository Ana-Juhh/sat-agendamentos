import type { LucideIcon } from "lucide-react";

// Desenho decorativo dos banners da Wiki: uma "janela" flutuando com o
// ícone do assunto, bolhas e brilhos em volta. Feito em SVG pra ficar leve
// e funcionar em qualquer tamanho, sem precisar de imagem.
export default function IlustracaoTema({
  icone: Icone,
  tamanho = "grande",
}: {
  icone: LucideIcon;
  tamanho?: "grande" | "pequena";
}) {
  const grande = tamanho === "grande";

  return (
    <div
      aria-hidden
      className={`relative shrink-0 ${grande ? "h-44 w-56" : "h-24 w-32"}`}
    >
      <svg viewBox="0 0 224 176" className="absolute inset-0 h-full w-full">
        <circle cx="178" cy="36" r="30" fill="white" fillOpacity="0.14" />
        <circle cx="34" cy="140" r="22" fill="white" fillOpacity="0.12" />
        <circle cx="200" cy="146" r="10" fill="white" fillOpacity="0.2" />

        {/* sombra da janela */}
        <rect x="46" y="40" width="140" height="104" rx="18" fill="black" fillOpacity="0.12" />

        {/* janela */}
        <g className="wiki-flutuar">
          <rect x="38" y="30" width="140" height="104" rx="18" fill="white" fillOpacity="0.95" />
          <rect x="38" y="30" width="140" height="24" rx="18" fill="white" />
          <rect x="38" y="44" width="140" height="10" fill="white" />
          <circle cx="56" cy="42" r="4" fill="#f87171" />
          <circle cx="70" cy="42" r="4" fill="#fbbf24" />
          <circle cx="84" cy="42" r="4" fill="#34d399" />
          <rect x="54" y="112" width="60" height="6" rx="3" fill="#cbd5e1" />
          <rect x="54" y="122" width="38" height="6" rx="3" fill="#e2e8f0" />
          <rect x="128" y="110" width="34" height="18" rx="9" fill="#6366f1" fillOpacity="0.9" />
        </g>

        {/* brilhos */}
        <path d="M24 44 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 z" fill="white" fillOpacity="0.85" />
        <path d="M196 92 l2.5 -6 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 z" fill="white" fillOpacity="0.7" />
      </svg>

      <div className="wiki-flutuar absolute left-[25%] top-[35%] flex h-[34%] w-[36%] items-center justify-center">
        <Icone className="h-full w-full text-indigo-600" strokeWidth={1.8} />
      </div>
    </div>
  );
}
