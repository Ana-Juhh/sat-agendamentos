"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleCheck,
  Clock,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import BackButton from "@/components/BackButton";
import HeaderDashboard from "@/components/HeaderDashboard";
import ConteudoWiki, { minutosDeLeitura, montarSecoes } from "@/components/wiki/ConteudoWiki";
import IlustracaoTema from "@/components/wiki/IlustracaoTema";
import PaginaForm from "@/components/wiki/PaginaForm";
import { iconePara, paletaPara } from "@/components/wiki/temas";
import AtividadeWiki from "@/components/wiki/AtividadeWiki";
import useProgressoWiki from "@/components/wiki/useProgressoWiki";
import { pb } from "@/lib/pocketbase";
import { canManageKnowledgeBase, canViewKnowledgeBase } from "@/lib/roles";
import {
  CATEGORIAS_WIKI,
  CategoriaWiki,
  emptyPaginaForm,
  getErrorMessage,
  PAGINAS_WIKI,
  PaginaWiki,
  paginaParaForm,
  ehAula,
  slugify,
} from "@/lib/wiki";

function formatarData(valor?: string) {
  if (!valor) return "";
  const data = new Date(valor.replace(" ", "T"));
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

export default function PaginaWikiPage() {
  const router = useRouter();
  const params = useParams<{ categoriaId: string; paginaId: string }>();
  const { categoriaId, paginaId } = params;
  const baseHref = `/admin/base-conhecimento/${categoriaId}`;

  const [role, setRole] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaWiki | null>(null);
  const [paginasCategoria, setPaginasCategoria] = useState<PaginaWiki[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  // "nova" = criando subpágina desta página; "editar" = editando esta página.
  const [formModo, setFormModo] = useState<"nova" | "editar" | null>(null);
  const [form, setForm] = useState(emptyPaginaForm);
  const formRef = useRef<HTMLDivElement | null>(null);
  const { estaConcluida, alternar, registrarVisita } = useProgressoWiki(categoriaId, authReady && pb.authStore.isValid);
  const [atividade, setAtividade] = useState({ total: 0, respondidas: 0 });
  const [concluindo, setConcluindo] = useState(false);
  const canView = canViewKnowledgeBase(role);
  const canManage = canManageKnowledgeBase(role);

  useEffect(() => {
    const syncAuth = () => {
      const user = pb.authStore.model as { role?: string } | null;
      setRole(user?.role || "");
      setAuthReady(true);
    };
    syncAuth();
    return pb.authStore.onChange(syncAuth);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!pb.authStore.isValid) return router.replace("/login");
    if (!canView) return router.replace("/dashboard");
    void loadData();
    setFormModo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, canView, categoriaId, paginaId, router]);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const [categoriaRecord, paginasRecords] = await Promise.all([
        pb.collection(CATEGORIAS_WIKI).getOne<CategoriaWiki>(categoriaId),
        pb.collection(PAGINAS_WIKI).getFullList<PaginaWiki>({
          filter: pb.filter("categoria = {:categoriaId}", { categoriaId }),
          sort: "ordem,titulo",
          requestKey: null,
        }),
      ]);
      setCategoria(categoriaRecord);
      setPaginasCategoria(paginasRecords);
    } catch (error) {
      setMessage(`Não foi possível carregar a página: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }

  const pagina = useMemo(
    () => paginasCategoria.find((item) => item.id === paginaId) ?? null,
    [paginasCategoria, paginaId]
  );

  const subpaginas = useMemo(
    () => paginasCategoria.filter((item) => item.pai === paginaId),
    [paginasCategoria, paginaId]
  );

  // Aulas no mesmo nível desta (mesmo tema pai), pra "Aula X de Y" e anterior/próxima.
  const irmas = useMemo(
    () => (pagina ? paginasCategoria.filter((item) => (item.pai || "") === (pagina.pai || "")) : []),
    [pagina, paginasCategoria]
  );
  const posicao = irmas.findIndex((item) => item.id === paginaId);
  const anterior = posicao > 0 ? irmas[posicao - 1] : null;
  const proxima = posicao >= 0 && posicao < irmas.length - 1 ? irmas[posicao + 1] : null;

  // Caminho do tema principal até esta página (pra montar a trilha no topo).
  const ancestrais = useMemo(() => {
    const caminho: PaginaWiki[] = [];
    const vistos = new Set<string>([paginaId]);
    let atual = pagina?.pai;
    while (atual && !vistos.has(atual)) {
      vistos.add(atual);
      const pai = paginasCategoria.find((item) => item.id === atual);
      if (!pai) break;
      caminho.unshift(pai);
      atual = pai.pai;
    }
    return caminho;
  }, [pagina, paginasCategoria, paginaId]);

  const secoes = useMemo(() => montarSecoes(pagina?.conteudo || ""), [pagina]);
  const secoesComTitulo = secoes.filter((secao) => secao.titulo);

  // O tema principal e todas as aulas dele usam a mesma cor.
  const paleta = paletaPara(ancestrais[0]?.id ?? paginaId);
  // Tema = página principal (pode ter aulas dentro). Só as aulas são concluídas.
  const ehTema = !pagina?.pai;
  const concluivel = Boolean(pagina && ehAula(pagina, paginasCategoria));
  const concluida = concluivel && estaConcluida(paginaId);
  const faltaAtividade = !canManage && atividade.respondidas < atividade.total;

  useEffect(() => {
    if (pagina) void registrarVisita(pagina.id);
  }, [pagina, registrarVisita]);

  async function alternarConclusao() {
    try {
      setConcluindo(true);
      await alternar(paginaId);
    } catch (error) {
      setMessage(`Não foi possível salvar o progresso: ${getErrorMessage(error)}`);
    } finally {
      setConcluindo(false);
    }
  }
  const subConcluidas = subpaginas.filter((sub) => estaConcluida(sub.id)).length;

  const voltarHref = ancestrais.length
    ? `${baseHref}/${ancestrais[ancestrais.length - 1].id}`
    : baseHref;
  const voltarLabel = ancestrais.length
    ? ancestrais[ancestrais.length - 1].titulo
    : categoria?.nome || "Categoria";

  useEffect(() => {
    if (formModo) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formModo]);

  function closeForm() {
    setFormModo(null);
    setForm(emptyPaginaForm);
  }

  function openNovaSubpagina() {
    setForm({ ...emptyPaginaForm, ordem: String(subpaginas.length + 1) });
    setFormModo("nova");
    setMessage("");
  }

  function openEditar() {
    if (!pagina) return;
    setForm(paginaParaForm(pagina));
    setFormModo("editar");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = slugify(form.slug);
    if (!form.titulo.trim() || !slug || !form.conteudo.trim()) {
      setMessage("Título, slug e conteúdo são obrigatórios.");
      return;
    }
    try {
      setSaving(true);
      setMessage("");
      const data = {
        categoria: categoriaId,
        titulo: form.titulo.trim(),
        slug,
        resumo: form.resumo.trim(),
        conteudo: form.conteudo.trim(),
        ordem: Number(form.ordem) || 0,
      };
      if (formModo === "editar") {
        await pb.collection(PAGINAS_WIKI).update(paginaId, data);
      } else {
        await pb.collection(PAGINAS_WIKI).create({ ...data, pai: paginaId });
      }
      closeForm();
      await loadData();
    } catch (error) {
      setMessage(`Não foi possível salvar a página: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pagina) return;
    const aviso = subpaginas.length
      ? `Excluir “${pagina.titulo}” e as ${subpaginas.length} subpágina(s) dele?`
      : `Excluir a página “${pagina.titulo}”?`;
    if (!window.confirm(aviso)) return;
    try {
      await pb.collection(PAGINAS_WIKI).delete(pagina.id);
      router.replace(voltarHref);
    } catch (error) {
      setMessage(`Não foi possível excluir a página: ${getErrorMessage(error)}`);
    }
  }

  const formulario = formModo && canManage && pagina && (
    <div ref={formRef} className="scroll-mt-24">
      {message && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}
      <PaginaForm
        titulo={formModo === "editar" ? "Editar página" : `Nova aula em “${pagina.titulo}”`}
        form={form}
        saving={saving}
        onChange={setForm}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />
    </div>
  );

  if (!authReady || !pb.authStore.isValid || !canView) return null;

  return (
    <>
      <HeaderDashboard />
      <main className="max-w-6xl mx-auto px-4 py-10 text-slate-900">
        <div className="mb-6">
          <BackButton href={voltarHref} label={voltarLabel} />
        </div>

        {message && !formModo && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-slate-500">
            Carregando aula...
          </div>
        ) : !pagina ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-bold">Página não encontrada</h2>
            <p className="mt-2 text-sm text-slate-500">Ela pode ter sido excluída.</p>
          </div>
        ) : (
          <>
            <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500">
              <Link href="/admin/base-conhecimento" className="hover:text-blue-600">Wiki de TI</Link>
              <ChevronRight size={14} />
              <Link href={baseHref} className="hover:text-blue-600">{categoria?.nome}</Link>
              {ancestrais.map((item) => (
                <span key={item.id} className="inline-flex items-center gap-1">
                  <ChevronRight size={14} />
                  <Link href={`${baseHref}/${item.id}`} className="hover:text-blue-600">{item.titulo}</Link>
                </span>
              ))}
            </nav>

            {/* Banner da aula */}
            <header
              className={`relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br ${paleta.banner} p-6 text-white shadow-lg sm:p-10`}
            >
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{categoria?.nome}</span>
                    {irmas.length > 1 && (
                      <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                        {ehTema ? "Módulo" : "Aula"} {posicao + 1} de {irmas.length}
                      </span>
                    )}
                    {concluida && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/90 px-3 py-1 text-emerald-950">
                        <CircleCheck size={14} /> Concluída
                      </span>
                    )}
                  </div>

                  <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                    {pagina.titulo}
                  </h1>
                  {pagina.resumo && <p className="mt-3 text-base text-white/90 sm:text-lg">{pagina.resumo}</p>}

                  <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/90">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={16} /> {minutosDeLeitura(pagina.conteudo)} min de leitura
                    </span>
                    {secoesComTitulo.length > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks size={16} /> {secoesComTitulo.length} parte(s)
                      </span>
                    )}
                    {subpaginas.length > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Layers size={16} /> {subpaginas.length} aula(s) dentro
                      </span>
                    )}
                  </div>

                  {canManage && (
                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={openEditar}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30"
                      >
                        <Pencil size={16} /> Editar
                      </button>
                      {ehTema && (
                        <button
                          onClick={openNovaSubpagina}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-white/90"
                        >
                          <Plus size={16} /> Nova aula
                        </button>
                      )}
                      <button
                        onClick={handleDelete}
                        aria-label="Excluir página"
                        className="rounded-xl bg-white/20 p-2 text-white backdrop-blur hover:bg-red-500/80"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="hidden sm:block">
                  <IlustracaoTema icone={iconePara(pagina.titulo)} />
                </div>
              </div>
            </header>

            {formModo === "editar" && formulario}

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0">
                <ConteudoWiki
                  secoes={secoes}
                  aulas={subpaginas.map((sub) => ({
                    titulo: sub.titulo,
                    href: `${baseHref}/${sub.id}`,
                    concluida: estaConcluida(sub.id),
                  }))}
                />

                {concluivel && (
                  <AtividadeWiki key={paginaId} paginaId={paginaId} canManage={canManage} onStatus={setAtividade} />
                )}

                {/* Concluir aula (só nas aulas; o tema é a introdução do módulo) */}
                {concluivel && (
                <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
                  <p className="text-slate-600">
                    {concluida
                      ? "Boa! Você já concluiu esta aula."
                      : faltaAtividade
                        ? "Responda a atividade acima para concluir a aula."
                        : "Terminou de ler e praticar?"}
                  </p>
                  <button
                    onClick={alternarConclusao}
                    disabled={concluindo || (!concluida && faltaAtividade)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      concluida
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <CircleCheck size={20} />
                    {concluida ? "Aula concluída" : "Marcar como concluída"}
                  </button>
                  {formatarData(pagina.updated) && (
                    <p className="text-xs text-slate-400">Conteúdo atualizado em {formatarData(pagina.updated)}</p>
                  )}
                </div>
                )}

                {/* Anterior / próxima */}
                {(anterior || proxima) && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {anterior ? (
                      <Link
                        href={`${baseHref}/${anterior.id}`}
                        className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
                      >
                        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <ArrowLeft size={14} /> Anterior
                        </span>
                        <span className="mt-1 block font-semibold group-hover:text-blue-600">{anterior.titulo}</span>
                      </Link>
                    ) : (
                      <span />
                    )}
                    {proxima && (
                      <Link
                        href={`${baseHref}/${proxima.id}`}
                        className="group rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:border-blue-300"
                      >
                        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Próxima <ArrowRight size={14} />
                        </span>
                        <span className="mt-1 block font-semibold group-hover:text-blue-600">{proxima.titulo}</span>
                      </Link>
                    )}
                  </div>
                )}

                {/* Aulas dentro deste tema */}
                {(subpaginas.length > 0 || (ehTema && canManage)) && (
                  <section className="mt-12">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold">Aulas deste módulo</h2>
                        {subpaginas.length > 0 && (
                          <p className="text-sm text-slate-500">
                            {subConcluidas} de {subpaginas.length} concluída(s)
                          </p>
                        )}
                      </div>
                      {canManage && ehTema && formModo !== "nova" && (
                        <button
                          onClick={openNovaSubpagina}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          <Plus size={16} /> Nova aula
                        </button>
                      )}
                    </div>

                    {formModo === "nova" && <div className="mb-6">{formulario}</div>}

                    {subpaginas.length > 0 && (
                      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${(subConcluidas / subpaginas.length) * 100}%` }}
                        />
                      </div>
                    )}

                    {subpaginas.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Nenhuma aula dentro deste tema ainda. Clique em “Nova aula” para criar a primeira.
                      </p>
                    ) : (
                      <ol className="space-y-3">
                        {subpaginas.map((sub, index) => {
                          const Icone = iconePara(sub.titulo);
                          const feita = estaConcluida(sub.id);
                          return (
                            <li key={sub.id}>
                              <Link
                                href={`${baseHref}/${sub.id}`}
                                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                              >
                                <span
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                    feita ? "bg-emerald-500 text-white" : `${paleta.suave} ${paleta.texto}`
                                  }`}
                                >
                                  {feita ? <CircleCheck size={20} /> : index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block font-semibold group-hover:text-blue-600">{sub.titulo}</span>
                                  {sub.resumo && (
                                    <span className="mt-0.5 block truncate text-sm text-slate-500">{sub.resumo}</span>
                                  )}
                                </span>
                                <Icone className="hidden shrink-0 text-slate-300 sm:block" size={24} />
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>
                )}
              </div>

              {/* Sumário lateral */}
              {secoesComTitulo.length > 1 && (
                <aside className="hidden lg:block">
                  <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nesta aula</p>
                    <ol className="mt-3 space-y-1">
                      {secoesComTitulo.map((secao, index) => {
                        const Icone = iconePara(secao.titulo || "");
                        return (
                          <li key={secao.id}>
                            <a
                              href={`#${secao.id}`}
                              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                            >
                              <Icone size={16} className="shrink-0 text-slate-400" />
                              <span className="truncate">
                                {index + 1}. {secao.titulo}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </aside>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
