import Link from "next/link";
import { ChevronRight, CircleCheck, Info, Lightbulb, LucideIcon, Target, TriangleAlert } from "lucide-react";

import { iconePara } from "@/components/wiki/temas";

// Transforma o texto simples das páginas da Wiki em uma "aula":
// - cada título abre uma seção em card, com ícone escolhido pelo assunto;
//   uma linha curta sozinha (sem ponto final) ou "# Título" viram título;
// - "## Subtítulo" vira subtítulo dentro da seção;
// - linhas com "- " viram lista com check; "1. " vira passo a passo;
// - parágrafos começando com "Dica:", "Atenção:", "Importante:", "Objetivo:"
//   ou "Obs:" viram caixinhas coloridas;
// - seções chamadas "Prática", "Exercício", "Atividade"... ganham destaque;
// - "![legenda](https://...)" mostra uma imagem;
// - "01 — Título" com a descrição na linha de baixo vira item do cronograma
//   (e vira link quando já existe uma aula com esse nome).
// Tudo é renderizado como texto (sem HTML), então não tem risco de injeção.

type VarianteCaixa = "dica" | "alerta" | "objetivo" | "info";

type Bloco =
  | { tipo: "paragrafo"; linhas: string[] }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "passos"; itens: string[] }
  | { tipo: "caixa"; variante: VarianteCaixa; rotulo: string; texto: string }
  | { tipo: "imagem"; legenda: string; url: string }
  | { tipo: "topicos"; itens: Array<{ numero: string; titulo: string; descricao: string }> };

export type SecaoWiki = {
  id: string;
  titulo: string | null;
  destaque: "pratica" | null;
  blocos: Bloco[];
};

const ITEM_LISTA = /^[-*•]\s+/;
const ITEM_NUMERADO = /^\d+[.)]\s+/;
const IMAGEM = /^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+)\)$/;
const TITULO_MARCADO = /^(#{1,3})\s+(.*)$/;
const CAIXA = /^(dica|aten[cç][aã]o|importante|cuidado|objetivo|obs|observa[cç][aã]o|lembre-se)\s*:\s*(.*)$/i;
const TOPICO = /^(d{1,2})s*[—–-]s+(.+)$/;
const SECAO_PRATICA = /pr[aá]tica|exerc[ií]cio|atividade|desafio|m[aã]o na massa/i;

function pareceTitulo(linha: string) {
  return (
    linha.length <= 70 &&
    !/[.;:,]$/.test(linha) &&
    !ITEM_LISTA.test(linha) &&
    !ITEM_NUMERADO.test(linha) &&
    !IMAGEM.test(linha)
  );
}

function varianteDaCaixa(rotulo: string): VarianteCaixa {
  const r = rotulo.toLowerCase();
  if (r.startsWith("dica") || r.startsWith("lembre")) return "dica";
  if (r.startsWith("objetivo")) return "objetivo";
  if (r.startsWith("obs")) return "info";
  return "alerta";
}

function slugTitulo(texto: string, usados: Set<string>) {
  const base =
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "secao";
  let id = base;
  let n = 2;
  while (usados.has(id)) id = `${base}-${n++}`;
  usados.add(id);
  return id;
}

export function montarSecoes(conteudo: string): SecaoWiki[] {
  const secoes: SecaoWiki[] = [];
  const usados = new Set<string>();
  let atual: SecaoWiki = { id: "introducao", titulo: null, destaque: null, blocos: [] };
  usados.add("introducao");

  const abrirSecao = (titulo: string) => {
    if (atual.titulo !== null || atual.blocos.length > 0) secoes.push(atual);
    atual = {
      id: slugTitulo(titulo, usados),
      titulo,
      destaque: SECAO_PRATICA.test(titulo) ? "pratica" : null,
      blocos: [],
    };
  };

  const grupos = (conteudo || "").replace(/\r\n/g, "\n").split(/\n\s*\n/);

  for (const grupo of grupos) {
    const linhas = grupo
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean);

    if (linhas.length === 0) continue;

    const topico = linhas[0].match(TOPICO);
    if (topico) {
      const item = { numero: topico[1].padStart(2, "0"), titulo: topico[2], descricao: linhas.slice(1).join(" ") };
      const ultimo = atual.blocos[atual.blocos.length - 1];
      if (ultimo?.tipo === "topicos") ultimo.itens.push(item);
      else atual.blocos.push({ tipo: "topicos", itens: [item] });
      continue;
    }

    if (linhas.length === 1 && !TITULO_MARCADO.test(linhas[0]) && pareceTitulo(linhas[0])) {
      abrirSecao(linhas[0]);
      continue;
    }

    let paragrafo: string[] = [];
    let lista: { tipo: "lista" | "passos"; itens: string[] } | null = null;

    const fecharParagrafo = () => {
      if (paragrafo.length === 0) return;
      const caixa = paragrafo[0].match(CAIXA);
      if (caixa) {
        const texto = [caixa[2], ...paragrafo.slice(1)].filter(Boolean).join("\n");
        atual.blocos.push({ tipo: "caixa", variante: varianteDaCaixa(caixa[1]), rotulo: caixa[1], texto });
      } else {
        atual.blocos.push({ tipo: "paragrafo", linhas: paragrafo });
      }
      paragrafo = [];
    };
    const fecharLista = () => {
      if (lista) atual.blocos.push(lista);
      lista = null;
    };

    for (const linha of linhas) {
      const marcado = linha.match(TITULO_MARCADO);
      if (marcado) {
        fecharParagrafo();
        fecharLista();
        if (marcado[1].length === 1) abrirSecao(marcado[2]);
        else atual.blocos.push({ tipo: "subtitulo", texto: marcado[2] });
        continue;
      }

      const imagem = linha.match(IMAGEM);
      if (imagem) {
        fecharParagrafo();
        fecharLista();
        atual.blocos.push({ tipo: "imagem", legenda: imagem[1], url: imagem[2] });
        continue;
      }

      const numerado = ITEM_NUMERADO.test(linha);
      if (numerado || ITEM_LISTA.test(linha)) {
        fecharParagrafo();
        const tipo = numerado ? "passos" : "lista";
        if (lista && lista.tipo !== tipo) fecharLista();
        if (!lista) lista = { tipo, itens: [] };
        lista.itens.push(linha.replace(numerado ? ITEM_NUMERADO : ITEM_LISTA, "").replace(/[;.]$/, ""));
        continue;
      }

      fecharLista();
      paragrafo.push(linha);
    }

    fecharParagrafo();
    fecharLista();
  }

  if (atual.titulo !== null || atual.blocos.length > 0) secoes.push(atual);
  return secoes;
}

export type AulaLink = { titulo: string; href: string; concluida?: boolean };

function normalizarTitulo(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^s*d{1,2}s*[—–.)-]?s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function minutosDeLeitura(conteudo: string) {
  const palavras = (conteudo || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 180));
}

const CAIXAS: Record<VarianteCaixa, { icone: LucideIcon; classe: string; iconeClasse: string }> = {
  dica: { icone: Lightbulb, classe: "bg-amber-100 border-amber-200", iconeClasse: "text-amber-600" },
  alerta: { icone: TriangleAlert, classe: "bg-red-50 border-red-200", iconeClasse: "text-red-600" },
  objetivo: { icone: Target, classe: "bg-blue-50 border-blue-200", iconeClasse: "text-blue-600" },
  info: { icone: Info, classe: "bg-slate-50 border-slate-200", iconeClasse: "text-slate-500" },
};

function BlocoWiki({ bloco, aulas }: { bloco: Bloco; aulas: AulaLink[] }) {
  switch (bloco.tipo) {
    case "topicos":
      return (
        <ol className="grid gap-3">
          {bloco.itens.map((item) => {
            const aula = aulas.find((a) => normalizarTitulo(a.titulo) === normalizarTitulo(item.titulo));
            const conteudo = (
              <>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                    aula?.concluida ? "bg-emerald-500 text-white" : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {aula?.concluida ? <CircleCheck size={20} /> : item.numero}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{item.titulo}</span>
                  {item.descricao && <span className="mt-0.5 block text-sm text-slate-500">{item.descricao}</span>}
                </span>
                {aula && <ChevronRight className="shrink-0 text-slate-400" size={20} />}
              </>
            );
            return (
              <li key={item.numero + item.titulo}>
                {aula ? (
                  <Link
                    href={aula.href}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {conteudo}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      );

    case "subtitulo":
      return <h3 className="pt-2 text-lg font-semibold text-slate-900">{bloco.texto}</h3>;

    case "lista": {
      const curtos = bloco.itens.every((item) => item.length <= 40);
      return (
        <ul className={`grid gap-2 ${curtos && bloco.itens.length > 3 ? "sm:grid-cols-2" : ""}`}>
          {bloco.itens.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <CircleCheck className="mt-0.5 shrink-0 text-emerald-500" size={20} />
              <span className="text-slate-700">{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "passos":
      return (
        <ol className="relative space-y-4 pl-2">
          {bloco.itens.map((item, index) => (
            <li key={index} className="relative flex items-start gap-4">
              {index < bloco.itens.length - 1 && (
                <span aria-hidden className="absolute left-[17px] top-10 h-[calc(100%-1rem)] w-0.5 bg-blue-100" />
              )}
              <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow">
                {index + 1}
              </span>
              <span className="pt-1.5 text-slate-700">{item}</span>
            </li>
          ))}
        </ol>
      );

    case "caixa": {
      const { icone: Icone, classe, iconeClasse } = CAIXAS[bloco.variante];
      return (
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${classe}`}>
          <Icone className={`mt-0.5 shrink-0 ${iconeClasse}`} size={20} />
          <p className="text-slate-700">
            <strong className="font-semibold">{bloco.rotulo}: </strong>
            {bloco.texto}
          </p>
        </div>
      );
    }

    case "imagem":
      return (
        <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bloco.url} alt={bloco.legenda} className="w-full object-contain" loading="lazy" />
          {bloco.legenda && (
            <figcaption className="px-4 py-2 text-center text-sm text-slate-500">{bloco.legenda}</figcaption>
          )}
        </figure>
      );

    default:
      return (
        <p className="leading-relaxed text-slate-700">
          {bloco.linhas.map((linha, index) => (
            <span key={index}>
              {index > 0 && <br />}
              {linha}
            </span>
          ))}
        </p>
      );
  }
}

export default function ConteudoWiki({ secoes, aulas = [] }: { secoes: SecaoWiki[]; aulas?: AulaLink[] }) {
  const comTitulo = secoes.filter((secao) => secao.titulo !== null);

  return (
    <div className="space-y-6">
      {secoes.map((secao) => {
        if (secao.titulo === null) {
          return (
            <div key={secao.id} className="space-y-4 text-lg">
              {secao.blocos.map((bloco, index) => (
                <BlocoWiki key={index} bloco={bloco} aulas={aulas} />
              ))}
            </div>
          );
        }

        const numero = comTitulo.indexOf(secao) + 1;
        const Icone = iconePara(secao.titulo);
        const pratica = secao.destaque === "pratica";

        return (
          <section
            key={secao.id}
            id={secao.id}
            className={`scroll-mt-24 rounded-3xl border p-6 shadow-sm sm:p-8 ${
              pratica ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="mb-5 flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  pratica ? "bg-emerald-600 text-white" : "bg-blue-50 text-blue-600"
                }`}
              >
                <Icone size={24} />
              </div>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${pratica ? "text-green-700" : "text-blue-600"}`}>
                  {pratica ? "Mão na massa" : `Parte ${numero}`}
                </p>
                <h2 className="text-2xl font-bold text-slate-900">{secao.titulo}</h2>
              </div>
            </div>

            <div className="space-y-4">
              {secao.blocos.map((bloco, index) => (
                <BlocoWiki key={index} bloco={bloco} aulas={aulas} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
