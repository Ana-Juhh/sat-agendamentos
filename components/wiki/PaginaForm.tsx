"use client";

import { FormEvent } from "react";
import { X } from "lucide-react";

import { PaginaWikiForm, slugify } from "@/lib/wiki";

type Props = {
  titulo: string;
  form: PaginaWikiForm;
  saving: boolean;
  onChange: (form: PaginaWikiForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export default function PaginaForm({ titulo, form, saving, onChange, onSubmit, onClose }: Props) {
  function updateTitle(novoTitulo: string) {
    onChange({
      ...form,
      titulo: novoTitulo,
      slug: form.slug === slugify(form.titulo) ? slugify(novoTitulo) : form.slug,
    });
  }

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{titulo}</h2>
        <button onClick={onClose} aria-label="Fechar formulário" className="rounded-xl p-2 hover:bg-slate-100">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Título
          <input
            value={form.titulo}
            onChange={(event) => updateTitle(event.target.value)}
            maxLength={180}
            required
            className="rounded-xl border border-slate-200 px-3 py-2.5"
            placeholder="Ex.: Windows"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Slug
          <input
            value={form.slug}
            onChange={(event) => onChange({ ...form, slug: slugify(event.target.value) })}
            maxLength={200}
            required
            className="rounded-xl border border-slate-200 px-3 py-2.5"
            placeholder="windows"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Resumo <span className="font-normal text-slate-500">(opcional)</span>
          <textarea
            value={form.resumo}
            onChange={(event) => onChange({ ...form, resumo: event.target.value })}
            maxLength={500}
            rows={2}
            className="rounded-xl border border-slate-200 px-3 py-2.5"
            placeholder="Uma breve explicação do que tem nesta página."
          />
        </label>

        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Conteúdo
          <textarea
            value={form.conteudo}
            onChange={(event) => onChange({ ...form, conteudo: event.target.value })}
            rows={14}
            required
            className="rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm"
            placeholder="Escreva aqui o procedimento passo a passo."
          />
          <span className="text-xs font-normal text-slate-500">
            Dicas: deixe uma linha em branco entre parágrafos. Uma linha curta sozinha vira título
            (ou use <code># Título</code>). Comece a linha com <code>- </code> para lista ou{" "}
            <code>1. </code> para passo a passo numerado.
          </span>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Ordem
          <input
            type="number"
            min="0"
            step="1"
            value={form.ordem}
            onChange={(event) => onChange({ ...form, ordem: event.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 font-medium hover:bg-slate-100">
            Cancelar
          </button>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar página"}
          </button>
        </div>
      </form>
    </section>
  );
}
