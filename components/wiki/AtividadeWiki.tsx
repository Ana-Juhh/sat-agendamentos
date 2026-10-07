"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { pb } from "@/lib/pocketbase";
import {
  GABARITOS_WIKI,
  GabaritoWiki,
  getErrorMessage,
  letraAlternativa,
  QUESTOES_WIKI,
  QuestaoWiki,
  RESPOSTAS_WIKI,
  RespostaWiki,
} from "@/lib/wiki";

type Props = {
  paginaId: string;
  canManage: boolean;
  // Avisa a página quantas questões existem e quantas a pessoa já respondeu
  // (a aula só pode ser concluída depois de responder a atividade).
  onStatus?: (status: { total: number; respondidas: number }) => void;
};

type QuestaoForm = {
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
};

const formVazio: QuestaoForm = { enunciado: "", alternativas: ["", "", ""], correta: 0, explicacao: "" };

export default function AtividadeWiki({ paginaId, canManage, onStatus }: Props) {
  const [questoes, setQuestoes] = useState<QuestaoWiki[]>([]);
  const [respostas, setRespostas] = useState<Record<string, RespostaWiki>>({});
  const [gabaritos, setGabaritos] = useState<Record<string, GabaritoWiki>>({});
  const [escolhas, setEscolhas] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState<QuestaoWiki | "nova" | null>(null);
  const [form, setForm] = useState<QuestaoForm>(formVazio);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const usuarioId = pb.authStore.model?.id || "";
      const lista = await pb.collection(QUESTOES_WIKI).getFullList<QuestaoWiki>({
        filter: pb.filter("pagina = {:pagina}", { pagina: paginaId }),
        sort: "ordem,created",
        requestKey: null,
      });
      setQuestoes(lista);

      if (canManage) {
        const gabs = lista.length
          ? await pb.collection(GABARITOS_WIKI).getFullList<GabaritoWiki>({
              filter: pb.filter("questao.pagina = {:pagina}", { pagina: paginaId }),
              requestKey: null,
            })
          : [];
        setGabaritos(Object.fromEntries(gabs.map((g) => [g.questao, g])));
      } else {
        const resps = await pb.collection(RESPOSTAS_WIKI).getFullList<RespostaWiki>({
          filter: pb.filter("pagina = {:pagina} && usuario = {:usuario}", { pagina: paginaId, usuario: usuarioId }),
          requestKey: null,
        });
        setRespostas(Object.fromEntries(resps.map((r) => [r.questao, r])));
      }
    } catch (error) {
      setErro(`Não foi possível carregar a atividade: ${getErrorMessage(error)}`);
    } finally {
      setCarregando(false);
    }
  }, [paginaId, canManage]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const respondidas = questoes.filter((q) => respostas[q.id]).length;
  const acertos = questoes.filter((q) => respostas[q.id]?.acertou).length;

  useEffect(() => {
    onStatus?.({ total: questoes.length, respondidas: canManage ? questoes.length : respondidas });
  }, [questoes.length, respondidas, canManage, onStatus]);

  async function responder(questao: QuestaoWiki) {
    const alternativa = escolhas[questao.id];
    if (alternativa === undefined) return;
    try {
      setEnviando(questao.id);
      setErro("");
      const resposta = await pb
        .collection(RESPOSTAS_WIKI)
        .create<RespostaWiki>({ questao: questao.id, alternativa });
      setRespostas((atuais) => ({ ...atuais, [questao.id]: resposta }));
    } catch (error) {
      setErro(`Não foi possível enviar a resposta: ${getErrorMessage(error)}`);
    } finally {
      setEnviando(null);
    }
  }

  // ---- gestão (superadmin) ----

  function abrirNova() {
    setForm(formVazio);
    setEditando("nova");
    setErro("");
  }

  function abrirEdicao(questao: QuestaoWiki) {
    const gabarito = gabaritos[questao.id];
    setForm({
      enunciado: questao.enunciado,
      alternativas: [...questao.alternativas],
      correta: gabarito?.correta ?? 0,
      explicacao: gabarito?.explicacao || "",
    });
    setEditando(questao);
    setErro("");
  }

  function fecharForm() {
    setEditando(null);
    setForm(formVazio);
  }

  function mudarAlternativa(indice: number, valor: string) {
    setForm((atual) => ({
      ...atual,
      alternativas: atual.alternativas.map((texto, i) => (i === indice ? valor : texto)),
    }));
  }

  function removerAlternativa(indice: number) {
    setForm((atual) => {
      const alternativas = atual.alternativas.filter((_, i) => i !== indice);
      let correta = atual.correta;
      if (indice === correta) correta = 0;
      else if (indice < correta) correta -= 1;
      return { ...atual, alternativas, correta };
    });
  }

  async function salvarQuestao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const alternativas = form.alternativas.map((texto) => texto.trim());
    if (!form.enunciado.trim()) return setErro("Escreva a pergunta.");
    if (alternativas.length < 2 || alternativas.some((texto) => !texto)) {
      return setErro("Preencha todas as alternativas (mínimo de 2).");
    }
    try {
      setSalvando(true);
      setErro("");
      const dados = { pagina: paginaId, enunciado: form.enunciado.trim(), alternativas };
      const gabaritoDados = { correta: form.correta, explicacao: form.explicacao.trim() };

      if (editando && editando !== "nova") {
        await pb.collection(QUESTOES_WIKI).update(editando.id, dados);
        const gabarito = gabaritos[editando.id];
        if (gabarito) await pb.collection(GABARITOS_WIKI).update(gabarito.id, gabaritoDados);
        else await pb.collection(GABARITOS_WIKI).create({ questao: editando.id, ...gabaritoDados });
      } else {
        const criada = await pb
          .collection(QUESTOES_WIKI)
          .create<QuestaoWiki>({ ...dados, ordem: questoes.length });
        await pb.collection(GABARITOS_WIKI).create({ questao: criada.id, ...gabaritoDados });
      }
      fecharForm();
      await carregar();
    } catch (error) {
      setErro(`Não foi possível salvar a questão: ${getErrorMessage(error)}`);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirQuestao(questao: QuestaoWiki) {
    if (!window.confirm("Excluir esta questão? As respostas dos estagiários para ela também serão apagadas.")) return;
    try {
      await pb.collection(QUESTOES_WIKI).delete(questao.id);
      await carregar();
    } catch (error) {
      setErro(`Não foi possível excluir a questão: ${getErrorMessage(error)}`);
    }
  }

  const resumo = useMemo(() => {
    if (canManage) return `${questoes.length} questão(ões) nesta aula`;
    if (respondidas === 0) return "Responda para concluir a aula. Cada questão tem uma tentativa.";
    if (respondidas < questoes.length) return `${respondidas} de ${questoes.length} respondida(s)`;
    return `Você acertou ${acertos} de ${questoes.length}`;
  }, [canManage, questoes.length, respondidas, acertos]);

  if (carregando) return null;
  if (questoes.length === 0 && !canManage) return null;

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Hora de testar</p>
            <h2 className="text-2xl font-bold text-slate-900">Atividade</h2>
            <p className="text-sm text-slate-500">{resumo}</p>
          </div>
        </div>
        {canManage && !editando && (
          <button
            onClick={abrirNova}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus size={16} /> Adicionar questão
          </button>
        )}
      </div>

      {erro && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {canManage && editando && (
        <form onSubmit={salvarQuestao} className="mb-6 grid gap-4 rounded-2xl border border-violet-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{editando === "nova" ? "Nova questão" : "Editar questão"}</h3>
            <button type="button" onClick={fecharForm} aria-label="Fechar" className="rounded-xl p-1.5 hover:bg-slate-200">
              <X size={18} />
            </button>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Pergunta
            <textarea
              value={form.enunciado}
              onChange={(event) => setForm({ ...form, enunciado: event.target.value })}
              rows={2}
              required
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              placeholder="Ex.: Qual é a função do sistema operacional?"
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
              Alternativas <span className="font-normal text-slate-500">(marque a certa)</span>
            </legend>
            {form.alternativas.map((texto, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <label className="flex shrink-0 cursor-pointer items-center gap-2" title="Marcar como resposta certa">
                  <input
                    type="radio"
                    name="correta"
                    checked={form.correta === indice}
                    onChange={() => setForm({ ...form, correta: indice })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="w-5 text-sm font-bold text-slate-500">{letraAlternativa(indice)}</span>
                </label>
                <input
                  value={texto}
                  onChange={(event) => mudarAlternativa(indice, event.target.value)}
                  required
                  className={`flex-1 rounded-xl border bg-white px-3 py-2 ${
                    form.correta === indice ? "border-emerald-400" : "border-slate-200"
                  }`}
                  placeholder={`Alternativa ${letraAlternativa(indice)}`}
                />
                {form.alternativas.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removerAlternativa(indice)}
                    aria-label={`Remover alternativa ${letraAlternativa(indice)}`}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {form.alternativas.length < 6 && (
              <button
                type="button"
                onClick={() => setForm({ ...form, alternativas: [...form.alternativas, ""] })}
                className="justify-self-start rounded-lg px-2 py-1 text-sm font-medium text-violet-700 hover:bg-violet-100"
              >
                + Adicionar alternativa
              </button>
            )}
          </fieldset>

          <label className="grid gap-2 text-sm font-medium">
            Explicação <span className="font-normal text-slate-500">(aparece depois que a pessoa responde)</span>
            <textarea
              value={form.explicacao}
              onChange={(event) => setForm({ ...form, explicacao: event.target.value })}
              rows={2}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              placeholder="Por que essa é a resposta certa?"
            />
          </label>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={fecharForm} className="rounded-xl px-4 py-2 font-medium hover:bg-slate-200">
              Cancelar
            </button>
            <button disabled={salvando} className="rounded-xl bg-violet-600 px-5 py-2 font-semibold text-white disabled:opacity-60">
              {salvando ? "Salvando..." : "Salvar questão"}
            </button>
          </div>
        </form>
      )}

      {questoes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Nenhuma questão ainda. Adicione perguntas de múltipla escolha para ver se os estagiários entenderam a aula.
        </p>
      ) : (
        <ol className="space-y-6">
          {questoes.map((questao, numero) => {
            const resposta = respostas[questao.id];
            const gabarito = gabaritos[questao.id];
            const certa = canManage ? gabarito?.correta : resposta?.correta;
            const escolhida = resposta ? resposta.alternativa : escolhas[questao.id];
            const travada = canManage || Boolean(resposta);

            return (
              <li key={questao.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">
                    <span className="mr-2 text-violet-600">{numero + 1}.</span>
                    {questao.enunciado}
                  </p>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => abrirEdicao(questao)} aria-label="Editar questão" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => excluirQuestao(questao)} aria-label="Excluir questão" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  {questao.alternativas.map((texto, indice) => {
                    const ehCerta = certa === indice && (canManage || Boolean(resposta));
                    const ehErrada = Boolean(resposta) && indice === resposta.alternativa && !resposta.acertou;
                    const selecionada = !resposta && escolhida === indice;

                    let estilo = "border-slate-200 bg-white hover:border-violet-300";
                    if (ehCerta) estilo = "border-emerald-400 bg-green-50";
                    else if (ehErrada) estilo = "border-red-300 bg-red-50";
                    else if (selecionada) estilo = "border-violet-500 bg-violet-50 ring-2 ring-violet-200";
                    else if (travada) estilo = "border-slate-200 bg-white opacity-70";

                    return (
                      <button
                        key={indice}
                        type="button"
                        disabled={travada}
                        onClick={() => setEscolhas((atuais) => ({ ...atuais, [questao.id]: indice }))}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${estilo}`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            ehCerta
                              ? "bg-emerald-500 text-white"
                              : ehErrada
                                ? "bg-red-500 text-white"
                                : selecionada
                                  ? "bg-violet-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ehCerta ? <CircleCheck size={18} /> : ehErrada ? <CircleX size={18} /> : letraAlternativa(indice)}
                        </span>
                        <span className="text-slate-700">{texto}</span>
                        {ehCerta && canManage && (
                          <span className="ml-auto text-xs font-semibold text-green-700">Resposta certa</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {!canManage && !resposta && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => responder(questao)}
                      disabled={escolhida === undefined || enviando === questao.id}
                      className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {enviando === questao.id ? "Enviando..." : "Responder"}
                    </button>
                  </div>
                )}

                {resposta && (
                  <div
                    className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                      resposta.acertou ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    {resposta.acertou ? (
                      <CircleCheck className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                    ) : (
                      <CircleX className="mt-0.5 shrink-0 text-red-600" size={20} />
                    )}
                    <p className="text-slate-700">
                      <strong>{resposta.acertou ? "Você acertou!" : `Não foi dessa vez. A certa é a ${letraAlternativa(resposta.correta)}.`}</strong>
                      {resposta.explicacao && <> {resposta.explicacao}</>}
                    </p>
                  </div>
                )}

                {canManage && gabarito?.explicacao && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-100 px-4 py-3">
                    <Lightbulb className="mt-0.5 shrink-0 text-amber-600" size={20} />
                    <p className="text-slate-700">{gabarito.explicacao}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
