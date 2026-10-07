"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Clock, FileText, Layers, Pencil, Plus, Trash2 } from "lucide-react";

import BackButton from "@/components/BackButton";
import HeaderDashboard from "@/components/HeaderDashboard";
import { minutosDeLeitura } from "@/components/wiki/ConteudoWiki";
import IlustracaoTema from "@/components/wiki/IlustracaoTema";
import PaginaForm from "@/components/wiki/PaginaForm";
import { iconePara, paletaPara } from "@/components/wiki/temas";
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
  slugify,
} from "@/lib/wiki";

export default function PaginasConhecimentoPage() {
  const router = useRouter();
  const params = useParams<{ categoriaId: string }>();
  const categoriaId = params.categoriaId;
  const [role, setRole] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaWiki | null>(null);
  const [paginas, setPaginas] = useState<PaginaWiki[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaginaWiki | null>(null);
  const [form, setForm] = useState(emptyPaginaForm);
  const { estaConcluida } = useProgressoWiki(categoriaId, authReady && pb.authStore.isValid);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, canView, categoriaId, router]);

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
      setPaginas(paginasRecords);
    } catch (error) {
      setMessage(`Não foi possível carregar esta categoria: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }

  // Só os temas principais aparecem aqui; as subpáginas ficam dentro de cada tema.
  const temas = useMemo(() => paginas.filter((pagina) => !pagina.pai), [paginas]);

  function totalSubpaginas(paginaId: string) {
    return paginas.filter((pagina) => pagina.pai === paginaId).length;
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyPaginaForm);
  }

  function openNewForm() {
    setEditing(null);
    setForm({ ...emptyPaginaForm, ordem: String(temas.length) });
    setFormOpen(true);
    setMessage("");
  }

  function openEditForm(pagina: PaginaWiki) {
    setEditing(pagina);
    setForm(paginaParaForm(pagina));
    setFormOpen(true);
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
      if (editing) await pb.collection(PAGINAS_WIKI).update(editing.id, data);
      else await pb.collection(PAGINAS_WIKI).create(data);
      closeForm();
      await loadData();
    } catch (error) {
      setMessage(`Não foi possível salvar a página: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pagina: PaginaWiki) {
    const subpaginas = totalSubpaginas(pagina.id);
    const aviso = subpaginas
      ? `Excluir o tema “${pagina.titulo}” e as ${subpaginas} subpágina(s) dele?`
      : `Excluir a página “${pagina.titulo}”?`;
    if (!window.confirm(aviso)) return;
    try {
      setMessage("");
      await pb.collection(PAGINAS_WIKI).delete(pagina.id);
      await loadData();
    } catch (error) {
      setMessage(`Não foi possível excluir a página: ${getErrorMessage(error)}`);
    }
  }

  if (!authReady || !pb.authStore.isValid || !canView) return null;

  return (
    <>
      <HeaderDashboard />
      <main className="max-w-6xl mx-auto px-4 py-10 text-slate-900">
        <div className="mb-6">
          <BackButton href="/admin/base-conhecimento" label="Wiki de TI" />
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-slate-500">Categoria</p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-bold">{categoria?.nome || "Páginas"}</h1>
            {categoria?.descricao && <p className="mt-2 text-slate-600">{categoria.descricao}</p>}
          </div>
          {canManage && (
            <button
              onClick={openNewForm}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={19} /> Novo tema
            </button>
          )}
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        {formOpen && canManage && (
          <PaginaForm
            titulo={editing ? "Editar tema" : "Novo tema"}
            form={form}
            saving={saving}
            onChange={setForm}
            onSubmit={handleSubmit}
            onClose={closeForm}
          />
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-slate-500">
            Carregando páginas...
          </div>
        ) : temas.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <FileText className="mx-auto text-blue-600" size={40} />
            <h2 className="mt-4 text-lg font-bold">Nenhuma página criada</h2>
            <p className="mt-2 text-sm text-slate-500">
              {canManage
                ? "Crie o primeiro tema desta categoria. Dentro dele você pode adicionar subpáginas."
                : "As páginas publicadas pelo Admin Master aparecerão aqui."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {temas.map((pagina, index) => {
              const filhas = paginas.filter((item) => item.pai === pagina.id);
              // Tema sem aulas dentro conta como uma aula só.
              const aulas = filhas.length ? filhas : [pagina];
              const feitas = aulas.filter((aula) => estaConcluida(aula.id)).length;
              const href = `/admin/base-conhecimento/${categoriaId}/${pagina.id}`;
              const paleta = paletaPara(pagina.id);

              return (
                <article
                  key={pagina.id}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${paleta.banner}`}>
                    <span className="absolute left-4 top-4 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      Módulo {index + 1}
                    </span>
                    <IlustracaoTema icone={iconePara(pagina.titulo)} tamanho="pequena" />
                    {canManage && (
                      <div className="absolute right-3 top-3 z-10 flex gap-1">
                        <button
                          onClick={() => openEditForm(pagina)}
                          aria-label={`Editar ${pagina.titulo}`}
                          className="rounded-xl bg-white/25 p-2 text-white backdrop-blur hover:bg-white/40"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(pagina)}
                          aria-label={`Excluir ${pagina.titulo}`}
                          className="rounded-xl bg-white/25 p-2 text-white backdrop-blur hover:bg-red-500/80"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h2 className="text-xl font-bold group-hover:text-blue-600">
                      {/* O link cobre o card inteiro; os botões de editar/excluir ficam por cima. */}
                      <Link href={href} className="after:absolute after:inset-0 after:rounded-3xl">
                        {pagina.titulo}
                      </Link>
                    </h2>
                    {pagina.resumo && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{pagina.resumo}</p>}

                    <div className="mt-5 flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} /> {minutosDeLeitura(pagina.conteudo)} min
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers size={14} /> {filhas.length ? `${filhas.length} aula(s)` : "Aula única"}
                      </span>
                    </div>

                    {aulas.length > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${(feitas / aulas.length) * 100}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">{feitas} de {aulas.length} concluída(s)</p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
