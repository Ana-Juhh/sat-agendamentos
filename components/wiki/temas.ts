import {
  BookOpen,
  CircleHelp,
  Cloud,
  Cpu,
  FolderOpen,
  GraduationCap,
  Hand,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Lightbulb,
  LucideIcon,
  Mail,
  Monitor,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Target,
  TriangleAlert,
  Users,
  Wifi,
  Wrench,
} from "lucide-react";

// Escolhe um ícone pelo assunto do texto (título da aula ou da seção),
// pra página ganhar "desenhos" sem precisar subir imagem nenhuma.
const REGRAS_ICONE: Array<[RegExp, LucideIcon]> = [
  [/pr[aá]tica|exerc[ií]cio|atividade|desafio|m[aã]o na massa/i, Hand],
  [/objetivo|meta/i, Target],
  [/dica/i, Lightbulb],
  [/aten[cç][aã]o|cuidado|importante|aviso/i, TriangleAlert],
  [/o que [eé]|conceito|introdu/i, CircleHelp],
  [/windows|sistema operacional|computador|\bpc\b|monitor/i, Monitor],
  [/interface|[aá]rea de trabalho|menu|barra de tarefas/i, LayoutDashboard],
  [/arquivo|pasta|explorador/i, FolderOpen],
  [/rede|internet|wi-?fi|conectividade|cabo/i, Wifi],
  [/impressora|imprimir|impress[aã]o/i, Printer],
  [/chromebook|notebook|laptop/i, Laptop],
  [/gmail|e-?mail/i, Mail],
  [/drive|nuvem|google|workspace/i, Cloud],
  [/senha|login|acesso|conta/i, KeyRound],
  [/seguran[cç]a|permiss|admin/i, ShieldCheck],
  [/usu[aá]rio|equipe|estagi/i, Users],
  [/mem[oó]ria|processador|hardware|pe[cç]a/i, Cpu],
  [/configura|ajuste|instala/i, Settings],
  [/pesquis|busca|procurar/i, Search],
  [/manuten|conserto|carrinho|equipamento|ferramenta/i, Wrench],
  [/curso|trilha|aula|m[oó]dulo/i, GraduationCap],
];

export function iconePara(texto: string): LucideIcon {
  for (const [regra, icone] of REGRAS_ICONE) {
    if (regra.test(texto)) return icone;
  }
  return BookOpen;
}

export type Paleta = {
  banner: string;
  suave: string;
  texto: string;
  borda: string;
  solido: string;
};

// Classes escritas por extenso pro Tailwind enxergar.
const PALETAS: Paleta[] = [
  { banner: "from-blue-600 via-indigo-600 to-violet-600", suave: "bg-blue-50", texto: "text-blue-700", borda: "border-blue-200", solido: "bg-blue-600" },
  { banner: "from-emerald-500 via-teal-600 to-cyan-600", suave: "bg-green-50", texto: "text-green-700", borda: "border-green-200", solido: "bg-emerald-600" },
  { banner: "from-orange-500 via-rose-500 to-pink-600", suave: "bg-orange-50", texto: "text-orange-700", borda: "border-orange-200", solido: "bg-orange-500" },
  { banner: "from-sky-500 via-blue-600 to-indigo-700", suave: "bg-blue-50", texto: "text-blue-700", borda: "border-blue-200", solido: "bg-sky-600" },
  { banner: "from-violet-600 via-purple-600 to-fuchsia-600", suave: "bg-blue-50", texto: "text-blue-700", borda: "border-blue-200", solido: "bg-violet-600" },
];

// Mesma aula sempre com a mesma cor.
export function paletaPara(chave: string): Paleta {
  let soma = 0;
  for (const letra of chave) soma = (soma * 31 + letra.charCodeAt(0)) >>> 0;
  return PALETAS[soma % PALETAS.length];
}
