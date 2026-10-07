export const CATEGORIAS_WIKI = "categorias_conhecimento";
export const PAGINAS_WIKI = "paginas_conhecimento";

export type CategoriaWiki = { id: string; nome: string; descricao?: string };

export type PaginaWiki = {
  id: string;
  categoria: string;
  pai?: string;
  titulo: string;
  slug: string;
  resumo?: string;
  conteudo: string;
  ordem?: number;
  updated?: string;
};

export type PaginaWikiForm = {
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  ordem: string;
};

export const emptyPaginaForm: PaginaWikiForm = {
  titulo: "",
  slug: "",
  resumo: "",
  conteudo: "",
  ordem: "0",
};

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getErrorMessage(error: unknown) {
  return typeof error === "object" && error && "message" in error
    ? String(error.message)
    : "Ocorreu um erro inesperado.";
}

export function paginaParaForm(pagina: PaginaWiki): PaginaWikiForm {
  return {
    titulo: pagina.titulo,
    slug: pagina.slug,
    resumo: pagina.resumo || "",
    conteudo: pagina.conteudo,
    ordem: String(pagina.ordem ?? 0),
  };
}

export const PROGRESSO_WIKI = "progresso_wiki";
export const QUESTOES_WIKI = "questoes_wiki";
export const GABARITOS_WIKI = "gabaritos_wiki";
export const RESPOSTAS_WIKI = "respostas_wiki";

export type ProgressoWiki = {
  id: string;
  usuario: string;
  pagina: string;
  visitas?: number;
  primeira_visita?: string;
  ultima_visita?: string;
  concluida?: boolean;
  concluida_em?: string;
};

export type QuestaoWiki = {
  id: string;
  pagina: string;
  enunciado: string;
  alternativas: string[];
  ordem?: number;
};

export type GabaritoWiki = {
  id: string;
  questao: string;
  correta: number;
  explicacao?: string;
};

export type RespostaWiki = {
  id: string;
  usuario: string;
  questao: string;
  pagina: string;
  alternativa: number;
  acertou: boolean;
  correta: number;
  explicacao?: string;
  created?: string;
};

// Uma página conta como "aula" (pode ser concluída) quando está dentro de um
// tema, ou quando é uma página solta sem nenhuma aula dentro.
export function ehAula(pagina: PaginaWiki, todas: PaginaWiki[]) {
  return Boolean(pagina.pai) || !todas.some((outra) => outra.pai === pagina.id);
}

export function letraAlternativa(indice: number) {
  return String.fromCharCode(65 + indice);
}
