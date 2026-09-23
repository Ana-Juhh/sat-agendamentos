"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  Folder,
  Globe,
  Monitor,
  Network,
  Pencil,
  Plus,
  Printer,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import BackButton from "@/components/BackButton";
import HeaderDashboard from "@/components/HeaderDashboard";
import { pb } from "@/lib/pocketbase";
import { canManageKnowledgeBase, canViewKnowledgeBase } from "@/lib/roles";

type Categoria = {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  icone?: string;
  ordem?: number;
};

type CategoriaForm = {
  nome: string;
  slug: string;
  descricao: string;
  icone: string;
  ordem: string;
};

const emptyForm: CategoriaForm = {
  nome: "",
  slug: "",
  descricao: "",
  icone: "folder",
  ordem: "0",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data &&
    "data" in error.data &&
    typeof error.data.data === "object" &&
    error.data.data &&
    "slug" in error.data.data
  ) {
    return "Já existe uma categoria com este slug. Escolha outro slug ou edite a categoria existente.";
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return "Ocorreu um erro inesperado.";
}

function CategoryIcon({ name }: { name?: string }) {
  const Icon = {
    folder: Folder,
    monitor: Monitor,
    globe: Globe,
    network: Network,
    printer: Printer,
    settings: Settings,
    clipboard: ClipboardList,
  }[name || "folder"] || Folder;

  return <Icon size={24} />;
}

export default function BaseConhecimentoPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoriaForm>(emptyForm);

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

    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }

    if (!canView) {
      router.replace("/dashboard");
      return;
    }

    void loadCategorias();
  }, [authReady, canView, router]);

  async function loadCategorias() {
    try {
      setLoading(true);
      setMessage("");
      const records = await pb.collection("categorias_conhecimento").getFullList<Categoria>({
        sort: "ordem,nome",
        requestKey: null,
      });
      setCategorias(records);
    } catch (error) {
      setMessage(`Não foi possível carregar as categorias: ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }

  function openNewForm() {
    setEditing(null);
    setForm({ ...emptyForm, ordem: String(categorias.length) });
    setFormOpen(true);
    setMessage("");
  }

  function openEditForm(categoria: Categoria) {
    setEditing(categoria);
    setForm({
      nome: categoria.nome,
      slug: categoria.slug,
      descricao: categoria.descricao || "",
      icone: categoria.icone || "folder",
      ordem: String(categoria.ordem ?? 0),
    });
    setFormOpen(true);
    setMessage("");
  }

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
    setForm(emptyForm);
  }

  function updateName(value: string) {
    setForm((current) => ({
      ...current,
      nome: value,
      slug: current.slug === slugify(current.nome) ? slugify(value) : current.slug,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = slugify(form.slug);

    if (!form.nome.trim() || !slug) {
      setMessage("Informe um nome e um slug válido para a categoria.");
      return;
    }

    const existingCategory = categorias.find(
      (categoria) => categoria.slug === slug && categoria.id !== editing?.id
    );

    if (existingCategory) {
      setMessage(
        `A categoria “${existingCategory.nome}” já usa este slug. Edite-a em vez de criar outra.`
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      const data = {
        nome: form.nome.trim(),
        slug,
        descricao: form.descricao.trim(),
        icone: form.icone.trim() || "folder",
        ordem: Number(form.ordem) || 0,
      };

      if (editing) {
        await pb.collection("categorias_conhecimento").update(editing.id, data);
      } else {
        await pb.collection("categorias_conhecimento").create(data);
      }

      closeForm();
      await loadCategorias();
    } catch (error) {
      setMessage(`Não foi possível salvar a categoria: ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(categoria: Categoria) {
    if (!window.confirm(`Excluir a categoria “${categoria.nome}”?`)) return;

    try {
      setMessage("");
      await pb.collection("categorias_conhecimento").delete(categoria.id);
      setCategorias((current) => current.filter(({ id }) => id !== categoria.id));
    } catch (error) {
      setMessage(`Não foi possível excluir a categoria: ${errorMessage(error)}`);
    }
  }

  if (!authReady || !pb.authStore.isValid || !canView) return null;

  return (
    <>
      <HeaderDashboard />
      <main className="max-w-6xl mx-auto px-4 py-10 text-slate-900">
        <div className="mb-6">
          <BackButton href="/admin" label="Central de TI" />
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-slate-500">Central de TI</p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-bold">Wiki de TI</h1>
            <p className="mt-2 text-slate-600">Organize procedimentos, tutoriais e materiais de onboarding da equipe de TI.</p>
          </div>
          {canManage && (
            <button onClick={openNewForm} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
              <Plus size={19} /> Nova categoria
            </button>
          )}
        </div>

        {message && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}

        {formOpen && canManage && (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">{editing ? "Editar categoria" : "Nova categoria"}</h2>
              <button onClick={closeForm} aria-label="Fechar formulário" className="rounded-xl p-2 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">Nome
                <input value={form.nome} onChange={(event) => updateName(event.target.value)} maxLength={120} required className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Ex.: Chromebooks" />
              </label>
              <label className="grid gap-2 text-sm font-medium">Slug
                <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} maxLength={140} required className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="chromebooks" />
              </label>
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">Descrição <span className="font-normal text-slate-500">(opcional)</span>
                <textarea value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} maxLength={500} rows={3} className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="O que esta categoria reúne?" />
              </label>
              <label className="grid gap-2 text-sm font-medium">Ícone
                <select value={form.icone} onChange={(event) => setForm((current) => ({ ...current, icone: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <option value="folder">Pasta</option>
                  <option value="monitor">Chromebook</option>
                  <option value="globe">Google Workspace</option>
                  <option value="network">Rede</option>
                  <option value="printer">Impressora</option>
                  <option value="settings">Sistemas</option>
                  <option value="clipboard">Procedimentos</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">Ordem
                <input type="number" min="0" step="1" value={form.ordem} onChange={(event) => setForm((current) => ({ ...current, ordem: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5" />
              </label>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="rounded-xl px-4 py-2.5 font-medium hover:bg-slate-100">Cancelar</button>
                <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar categoria"}</button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-slate-500">Carregando categorias...</div>
        ) : categorias.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <BookOpen className="mx-auto text-blue-600" size={40} />
            <h2 className="mt-4 text-lg font-bold">Nenhuma categoria criada</h2>
            <p className="mt-2 text-sm text-slate-500">{canManage ? "Comece criando ou organizando os assuntos da Wiki de TI." : "As categorias criadas pelo Admin Master aparecerão aqui."}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((categoria) => (
              <article key={categoria.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><CategoryIcon name={categoria.icone} /></div>
                  {canManage && <div className="flex gap-1">
                    <button onClick={() => openEditForm(categoria)} aria-label={`Editar ${categoria.nome}`} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"><Pencil size={17} /></button>
                    <button onClick={() => handleDelete(categoria)} aria-label={`Excluir ${categoria.nome}`} className="rounded-xl p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
                  </div>}
                </div>
                <h2 className="mt-5 text-xl font-bold">{categoria.nome}</h2>
                {categoria.descricao && <p className="mt-2 text-sm text-slate-600">{categoria.descricao}</p>}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-400">/{categoria.slug} · ordem {categoria.ordem ?? 0}</p>
                  <Link href={`/admin/base-conhecimento/${categoria.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Ver páginas</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
