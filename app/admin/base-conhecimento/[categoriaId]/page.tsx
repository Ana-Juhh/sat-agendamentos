"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Pencil, Plus, Trash2, X } from "lucide-react";

import BackButton from "@/components/BackButton";
import HeaderDashboard from "@/components/HeaderDashboard";
import { pb } from "@/lib/pocketbase";
import { canManageKnowledgeBase, canViewKnowledgeBase } from "@/lib/roles";

type Categoria = { id: string; nome: string; descricao?: string };
type Pagina = { id: string; titulo: string; slug: string; resumo?: string; conteudo: string; ordem?: number };
type PageForm = { titulo: string; slug: string; resumo: string; conteudo: string; ordem: string };

const emptyForm: PageForm = { titulo: "", slug: "", resumo: "", conteudo: "", ordem: "0" };

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function getErrorMessage(error: unknown) {
  return typeof error === "object" && error && "message" in error ? String(error.message) : "Ocorreu um erro inesperado.";
}

export default function PaginasConhecimentoPage() {
  const router = useRouter();
  const params = useParams<{ categoriaId: string }>();
  const categoriaId = params.categoriaId;
  const [role, setRole] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Pagina | null>(null);
  const [form, setForm] = useState<PageForm>(emptyForm);
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
  }, [authReady, canView, categoriaId, router]);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const [categoriaRecord, paginasRecords] = await Promise.all([
        pb.collection("categorias_conhecimento").getOne<Categoria>(categoriaId),
        pb.collection("paginas_conhecimento").getFullList<Pagina>({ filter: `categoria = \"${categoriaId}\"`, sort: "ordem,titulo", requestKey: null }),
      ]);
      setCategoria(categoriaRecord);
      setPaginas(paginasRecords);
    } catch (error) {
      setMessage(`Não foi possível carregar esta categoria: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }

  function closeForm() { setFormOpen(false); setEditing(null); setForm(emptyForm); }
  function openNewForm() { setEditing(null); setForm({ ...emptyForm, ordem: String(paginas.length) }); setFormOpen(true); setMessage(""); }
  function openEditForm(pagina: Pagina) { setEditing(pagina); setForm({ titulo: pagina.titulo, slug: pagina.slug, resumo: pagina.resumo || "", conteudo: pagina.conteudo, ordem: String(pagina.ordem ?? 0) }); setFormOpen(true); setMessage(""); }
  function updateTitle(titulo: string) { setForm((current) => ({ ...current, titulo, slug: current.slug === slugify(current.titulo) ? slugify(titulo) : current.slug })); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = slugify(form.slug);
    if (!form.titulo.trim() || !slug || !form.conteudo.trim()) { setMessage("Título, slug e conteúdo são obrigatórios."); return; }
    try {
      setSaving(true); setMessage("");
      const data = { categoria: categoriaId, titulo: form.titulo.trim(), slug, resumo: form.resumo.trim(), conteudo: form.conteudo.trim(), ordem: Number(form.ordem) || 0 };
      if (editing) await pb.collection("paginas_conhecimento").update(editing.id, data);
      else await pb.collection("paginas_conhecimento").create(data);
      closeForm();
      await loadData();
    } catch (error) { setMessage(`Não foi possível salvar a página: ${getErrorMessage(error)}`); }
    finally { setSaving(false); }
  }

  async function handleDelete(pagina: Pagina) {
    if (!window.confirm(`Excluir a página “${pagina.titulo}”?`)) return;
    try { setMessage(""); await pb.collection("paginas_conhecimento").delete(pagina.id); setPaginas((current) => current.filter(({ id }) => id !== pagina.id)); }
    catch (error) { setMessage(`Não foi possível excluir a página: ${getErrorMessage(error)}`); }
  }

  if (!authReady || !pb.authStore.isValid || !canView) return null;

  return <>
    <HeaderDashboard />
    <main className="max-w-6xl mx-auto px-4 py-10 text-slate-900">
      <div className="mb-6"><BackButton href="/admin/base-conhecimento" label="Wiki de TI" /></div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div><p className="text-sm font-medium text-slate-500">Categoria</p><h1 className="mt-1 text-3xl sm:text-4xl font-bold">{categoria?.nome || "Páginas"}</h1>{categoria?.descricao && <p className="mt-2 text-slate-600">{categoria.descricao}</p>}</div>
        {canManage && <button onClick={openNewForm} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"><Plus size={19} /> Nova página</button>}
      </div>
      {message && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}
      {formOpen && canManage && <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{editing ? "Editar página" : "Nova página"}</h2><button onClick={closeForm} aria-label="Fechar formulário" className="rounded-xl p-2 hover:bg-slate-100"><X size={20} /></button></div><form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Título<input value={form.titulo} onChange={(event) => updateTitle(event.target.value)} maxLength={180} required className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Ex.: Como preparar um Chromebook" /></label><label className="grid gap-2 text-sm font-medium">Slug<input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} maxLength={200} required className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="como-preparar-um-chromebook" /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Resumo <span className="font-normal text-slate-500">(opcional)</span><textarea value={form.resumo} onChange={(event) => setForm((current) => ({ ...current, resumo: event.target.value }))} maxLength={500} rows={2} className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Uma breve explicação do procedimento." /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Conteúdo<textarea value={form.conteudo} onChange={(event) => setForm((current) => ({ ...current, conteudo: event.target.value }))} rows={12} required className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Escreva aqui o procedimento passo a passo." /></label><label className="grid gap-2 text-sm font-medium">Ordem<input type="number" min="0" step="1" value={form.ordem} onChange={(event) => setForm((current) => ({ ...current, ordem: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5" /></label><div className="sm:col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={closeForm} className="rounded-xl px-4 py-2.5 font-medium hover:bg-slate-100">Cancelar</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar página"}</button></div></form></section>}
      {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-slate-500">Carregando páginas...</div> : paginas.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"><FileText className="mx-auto text-blue-600" size={40} /><h2 className="mt-4 text-lg font-bold">Nenhuma página criada</h2><p className="mt-2 text-sm text-slate-500">{canManage ? "Crie o primeiro procedimento desta categoria." : "As páginas publicadas pelo Admin Master aparecerão aqui."}</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{paginas.map((pagina) => <article key={pagina.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FileText size={24} /></div>{canManage && <div className="flex gap-1"><button onClick={() => openEditForm(pagina)} aria-label={`Editar ${pagina.titulo}`} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"><Pencil size={17} /></button><button onClick={() => handleDelete(pagina)} aria-label={`Excluir ${pagina.titulo}`} className="rounded-xl p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button></div>}</div><h2 className="mt-5 text-xl font-bold">{pagina.titulo}</h2>{pagina.resumo && <p className="mt-2 text-sm text-slate-600">{pagina.resumo}</p>}<p className="mt-4 text-xs font-medium text-slate-400">/{pagina.slug} · ordem {pagina.ordem ?? 0}</p></article>)}</div>}
    </main>
  </>;
}
