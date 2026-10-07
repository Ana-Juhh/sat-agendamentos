"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Eye,
  GraduationCap,
  TriangleAlert,
  Users,
} from "lucide-react";

import BackButton from "@/components/BackButton";
import HeaderDashboard from "@/components/HeaderDashboard";
import { pb } from "@/lib/pocketbase";
import { canManageKnowledgeBase } from "@/lib/roles";
import {
  CATEGORIAS_WIKI,
  CategoriaWiki,
  ehAula,
  getErrorMessage,
  PAGINAS_WIKI,
  PaginaWiki,
  PROGRESSO_WIKI,
  ProgressoWiki,
  QUESTOES_WIKI,
  QuestaoWiki,
  RESPOSTAS_WIKI,
  RespostaWiki,
} from "@/lib/wiki";

type Usuario = { id: string; name?: string; email?: string; role?: string };

type Turno = "todos" | "manha" | "tarde";

const DIAS_PARADO = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

function paraData(valor?: string) {
  if (!valor) return null;
  const data = new Date(valor.replace(" ", "T"));
  return Number.isNaN(data.getTime()) ? null : data;
}

function diasDesde(data: Date | null) {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dia = new Date(data);
  dia.setHours(0, 0, 0, 0);
  return Math.round((hoje.getTime() - dia.getTime()) / DIA_MS);
}

function quando(data: Date | null) {
  const dias = diasDesde(data);
  if (dias === null) return "Nunca";
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return `Há ${dias} dias`;
}

function dataCurta(data: Date | null) {
  return data ? data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
}

function nomeTurno(role?: string) {
  if (role === "estagiario_manha") return "Manhã";
  if (role === "estagiario_tarde") return "Tarde";
  return "—";
}

function ehEstagiario(role?: string) {
  return role === "estagiario_manha" || role === "estagiario_tarde";
}

function pct(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

// Barra de progresso de uma cor só; o número vem sempre escrito ao lado.
function Barra({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo}
      title={rotulo}
    >
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${valor}%` }} />
    </div>
  );
}

type Status = { rotulo: string; icone: typeof CircleCheck; classe: string };

function statusDe(visitas: number, ultima: Date | null, concluidas: number, total: number): Status {
  if (visitas === 0) return { rotulo: "Não começou", icone: CircleDashed, classe: "bg-slate-100 text-slate-600" };
  if (total > 0 && concluidas >= total) return { rotulo: "Concluiu tudo", icone: GraduationCap, classe: "bg-green-50 text-green-700" };
  const dias = diasDesde(ultima) ?? 0;
  if (dias > DIAS_PARADO) return { rotulo: `Parado há ${dias} dias`, icone: Clock, classe: "bg-amber-100 text-amber-700" };
  return { rotulo: "Em andamento", icone: CircleCheck, classe: "bg-blue-50 text-blue-700" };
}

export default function PainelWikiPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [categorias, setCategorias] = useState<CategoriaWiki[]>([]);
  const [paginas, setPaginas] = useState<PaginaWiki[]>([]);
  const [progresso, setProgresso] = useState<ProgressoWiki[]>([]);
  const [questoes, setQuestoes] = useState<QuestaoWiki[]>([]);
  const [respostas, setRespostas] = useState<RespostaWiki[]>([]);
  const [turno, setTurno] = useState<Turno>("todos");
  const [incluirOutros, setIncluirOutros] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
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
    if (!canManage) return router.replace("/admin/base-conhecimento");

    async function carregar() {
      try {
        setLoading(true);
        const [us, cats, pags, prog, quests, resps] = await Promise.all([
          pb.collection("users").getFullList<Usuario>({ fields: "id,name,email,role", sort: "name", requestKey: null }),
          pb.collection(CATEGORIAS_WIKI).getFullList<CategoriaWiki>({ sort: "ordem,nome", requestKey: null }),
          pb.collection(PAGINAS_WIKI).getFullList<PaginaWiki>({ fields: "id,categoria,pai,titulo,ordem", sort: "ordem,titulo", requestKey: null }),
          pb.collection(PROGRESSO_WIKI).getFullList<ProgressoWiki>({ requestKey: null }),
          pb.collection(QUESTOES_WIKI).getFullList<QuestaoWiki>({ sort: "ordem,created", requestKey: null }),
          pb.collection(RESPOSTAS_WIKI).getFullList<RespostaWiki>({ fields: "id,usuario,questao,pagina,acertou,created", requestKey: null }),
        ]);
        setUsuarios(us);
        setCategorias(cats);
        setPaginas(pags);
        setProgresso(prog);
        setQuestoes(quests);
        setRespostas(resps);
      } catch (error) {
        setMessage(`Não foi possível carregar o painel: ${getErrorMessage(error)}`);
      } finally {
        setLoading(false);
      }
    }
    void carregar();
  }, [authReady, canManage, router]);

  const aulas = useMemo(() => paginas.filter((pagina) => ehAula(pagina, paginas)), [paginas]);
  const idsAulas = useMemo(() => new Set(aulas.map((aula) => aula.id)), [aulas]);

  // Linha por pessoa, com tudo que o painel precisa.
  const linhas = useMemo(() => {
    const comAtividade = new Set([...progresso.map((p) => p.usuario), ...respostas.map((r) => r.usuario)]);

    return usuarios
      .filter((u) => ehEstagiario(u.role) || (incluirOutros && comAtividade.has(u.id)))
      .filter((u) => turno === "todos" || u.role === (turno === "manha" ? "estagiario_manha" : "estagiario_tarde"))
      .map((usuario) => {
        const meuProgresso = progresso.filter((p) => p.usuario === usuario.id);
        const minhasRespostas = respostas.filter((r) => r.usuario === usuario.id);
        const concluidas = meuProgresso.filter((p) => p.concluida && idsAulas.has(p.pagina)).length;
        const visitas = meuProgresso.reduce((soma, p) => soma + (p.visitas || 0), 0);
        const datas = [
          ...meuProgresso.map((p) => paraData(p.ultima_visita)),
          ...minhasRespostas.map((r) => paraData(r.created)),
        ].filter((d): d is Date => Boolean(d));
        const ultima = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null;
        const acertos = minhasRespostas.filter((r) => r.acertou).length;

        return {
          usuario,
          progresso: Object.fromEntries(meuProgresso.map((p) => [p.pagina, p])),
          respostas: minhasRespostas,
          concluidas,
          visitas,
          ultima,
          acertos,
          respondidas: minhasRespostas.length,
          status: statusDe(visitas, ultima, concluidas, aulas.length),
        };
      })
      .sort((a, b) => (b.ultima?.getTime() ?? 0) - (a.ultima?.getTime() ?? 0));
  }, [usuarios, progresso, respostas, idsAulas, aulas.length, turno, incluirOutros]);

  const resumo = useMemo(() => {
    const ativos = linhas.filter((l) => (diasDesde(l.ultima) ?? Infinity) <= DIAS_PARADO).length;
    const respondidas = linhas.reduce((s, l) => s + l.respondidas, 0);
    const acertos = linhas.reduce((s, l) => s + l.acertos, 0);
    const mediaProgresso = linhas.length
      ? Math.round(linhas.reduce((s, l) => s + pct(l.concluidas, aulas.length), 0) / linhas.length)
      : 0;
    return {
      pessoas: linhas.length,
      ativos,
      mediaProgresso,
      concluidas: linhas.reduce((s, l) => s + l.concluidas, 0),
      respondidas,
      taxaAcerto: pct(acertos, respondidas),
    };
  }, [linhas, aulas.length]);

  // Desempenho de cada questão, considerando só as pessoas filtradas.
  const porQuestao = useMemo(() => {
    const idsPessoas = new Set(linhas.map((l) => l.usuario.id));
    return questoes
      .map((questao) => {
        const resps = respostas.filter((r) => r.questao === questao.id && idsPessoas.has(r.usuario));
        const acertos = resps.filter((r) => r.acertou).length;
        return {
          questao,
          aula: paginas.find((p) => p.id === questao.pagina),
          respostas: resps.length,
          taxa: pct(acertos, resps.length),
        };
      })
      .filter((item) => item.respostas > 0)
      .sort((a, b) => a.taxa - b.taxa);
  }, [questoes, respostas, paginas, linhas]);

  // Estrutura categoria > tema > aulas pro detalhe de cada pessoa.
  const estrutura = useMemo(
    () =>
      categorias
        .map((categoria) => {
          const daCategoria = paginas.filter((p) => p.categoria === categoria.id);
          const temas = daCategoria
            .filter((p) => !p.pai)
            .map((tema) => {
              const filhas = daCategoria.filter((p) => p.pai === tema.id);
              return { tema, aulas: filhas.length ? filhas : [tema] };
            });
          return { categoria, temas };
        })
        .filter((grupo) => grupo.temas.length > 0),
    [categorias, paginas]
  );

  if (!authReady || !pb.authStore.isValid || !canManage) return null;

  return (
    <>
      <HeaderDashboard />
      <main className="max-w-6xl mx-auto px-4 py-10 text-slate-900">
        <div className="mb-6">
          <BackButton href="/admin/base-conhecimento" label="Wiki de TI" />
        </div>

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Wiki de TI</p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-bold">Acompanhamento dos estagiários</h1>
            <p className="mt-2 text-slate-600">Quem está lendo, o que já concluiu e como está indo nas atividades.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Turno">
              {(["todos", "manha", "tarde"] as Turno[]).map((opcao) => (
                <button
                  key={opcao}
                  onClick={() => setTurno(opcao)}
                  aria-pressed={turno === opcao}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    turno === opcao ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {opcao === "todos" ? "Todos" : opcao === "manha" ? "Manhã" : "Tarde"}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={incluirOutros} onChange={(e) => setIncluirOutros(e.target.checked)} className="h-4 w-4" />
              Incluir outras pessoas que acessaram
            </label>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-slate-500">Carregando painel...</div>
        ) : (
          <>
            {/* Indicadores */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Estagiários</p>
                <p className="mt-2 text-4xl font-bold tabular-nums">{resumo.pessoas}</p>
                <p className="mt-1 text-sm text-slate-500">{resumo.ativos} ativo(s) nos últimos {DIAS_PARADO} dias</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Progresso médio</p>
                <p className="mt-2 text-4xl font-bold tabular-nums">{resumo.mediaProgresso}%</p>
                <div className="mt-3">
                  <Barra valor={resumo.mediaProgresso} rotulo={`Progresso médio: ${resumo.mediaProgresso}%`} />
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Aulas concluídas</p>
                <p className="mt-2 text-4xl font-bold tabular-nums">{resumo.concluidas}</p>
                <p className="mt-1 text-sm text-slate-500">de {aulas.length} aula(s) disponíveis por pessoa</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Acerto nas atividades</p>
                <p className="mt-2 text-4xl font-bold tabular-nums">{resumo.respondidas ? `${resumo.taxaAcerto}%` : "—"}</p>
                <p className="mt-1 text-sm text-slate-500">{resumo.respondidas} resposta(s)</p>
              </div>
            </div>

            {/* Tabela por pessoa */}
            <section className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
                <Users size={20} className="text-blue-600" />
                <h2 className="text-lg font-bold">Por estagiário</h2>
                <span className="text-sm text-slate-500">Clique em uma linha para ver aula por aula</span>
              </div>

              {linhas.length === 0 ? (
                <p className="p-8 text-center text-slate-500">
                  Nenhum estagiário encontrado. Os usuários precisam ter o cargo “estagiario_manha” ou “estagiario_tarde”.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Pessoa</th>
                        <th className="px-4 py-3 font-semibold">Progresso</th>
                        <th className="px-4 py-3 font-semibold">Atividades</th>
                        <th className="px-4 py-3 font-semibold">Última atividade</th>
                        <th className="px-4 py-3 font-semibold">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((linha) => {
                        const progressoPct = pct(linha.concluidas, aulas.length);
                        const taxa = pct(linha.acertos, linha.respondidas);
                        const expandido = aberto === linha.usuario.id;
                        const StatusIcone = linha.status.icone;

                        return (
                          <Fragment key={linha.usuario.id}>
                            <tr
                              onClick={() => setAberto(expandido ? null : linha.usuario.id)}
                              className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {expandido ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                  <div>
                                    <p className="font-semibold text-slate-900">{linha.usuario.name || linha.usuario.email}</p>
                                    <p className="text-xs text-slate-500">Turno: {nomeTurno(linha.usuario.role)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="w-56 px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <Barra valor={progressoPct} rotulo={`${linha.concluidas} de ${aulas.length} aulas concluídas`} />
                                  <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{progressoPct}%</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">{linha.concluidas} de {aulas.length} aulas</p>
                              </td>
                              <td className="px-4 py-4">
                                {linha.respondidas === 0 ? (
                                  <span className="text-slate-400">Nenhuma respondida</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5">
                                    {taxa < 50 && <TriangleAlert size={15} className="text-red-600" aria-label="Acerto abaixo de 50%" />}
                                    <span className="font-semibold tabular-nums">{taxa}%</span>
                                    <span className="text-slate-500">({linha.acertos}/{linha.respondidas} certas)</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {quando(linha.ultima)}
                                {linha.visitas > 0 && <p className="text-xs text-slate-400">{linha.visitas} abertura(s) de página</p>}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${linha.status.classe}`}>
                                  <StatusIcone size={14} /> {linha.status.rotulo}
                                </span>
                              </td>
                            </tr>

                            {expandido && (
                              <tr className="border-t border-slate-100 bg-slate-50">
                                <td colSpan={5} className="px-6 py-5">
                                  <div className="grid gap-6">
                                    {estrutura.map(({ categoria, temas }) => (
                                      <div key={categoria.id}>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{categoria.nome}</p>
                                        <div className="grid gap-3">
                                          {temas.map(({ tema, aulas: aulasDoTema }) => (
                                            <div key={tema.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                              <Link
                                                href={`/admin/base-conhecimento/${categoria.id}/${tema.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="font-semibold hover:text-blue-600"
                                              >
                                                {tema.titulo}
                                              </Link>
                                              <ul className="mt-2 divide-y divide-slate-100">
                                                {aulasDoTema.map((aula) => {
                                                  const prog = linha.progresso[aula.id];
                                                  const questoesAula = questoes.filter((q) => q.pagina === aula.id);
                                                  const respsAula = linha.respostas.filter((r) => r.pagina === aula.id);
                                                  const certas = respsAula.filter((r) => r.acertou).length;
                                                  return (
                                                    <li key={aula.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2 text-sm">
                                                      <span className="min-w-[200px] flex-1 text-slate-700">{aula.titulo}</span>
                                                      <span className="inline-flex w-36 items-center gap-1.5 text-slate-500">
                                                        <Eye size={14} />
                                                        {prog?.visitas ? `${prog.visitas}x · ${dataCurta(paraData(prog.ultima_visita))}` : "Não abriu"}
                                                      </span>
                                                      <span className="inline-flex w-36 items-center gap-1.5">
                                                        {prog?.concluida ? (
                                                          <>
                                                            <CircleCheck size={14} className="text-emerald-600" />
                                                            <span className="text-green-700">Concluída {dataCurta(paraData(prog.concluida_em))}</span>
                                                          </>
                                                        ) : (
                                                          <>
                                                            <CircleDashed size={14} className="text-slate-400" />
                                                            <span className="text-slate-500">Não concluída</span>
                                                          </>
                                                        )}
                                                      </span>
                                                      <span className="inline-flex w-40 items-center gap-1.5 text-slate-500">
                                                        {questoesAula.length === 0 ? (
                                                          "Sem atividade"
                                                        ) : respsAula.length === 0 ? (
                                                          `0/${questoesAula.length} respondidas`
                                                        ) : (
                                                          <>
                                                            {certas === respsAula.length ? (
                                                              <CircleCheck size={14} className="text-emerald-600" />
                                                            ) : (
                                                              <CircleX size={14} className="text-red-600" />
                                                            )}
                                                            {certas}/{questoesAula.length} certas
                                                          </>
                                                        )}
                                                      </span>
                                                    </li>
                                                  );
                                                })}
                                              </ul>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Por questão */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold">Desempenho por questão</h2>
                <p className="text-sm text-slate-500">As com menos acerto aparecem primeiro: podem indicar conteúdo que precisa ser melhor explicado.</p>
              </div>
              {porQuestao.length === 0 ? (
                <p className="p-8 text-center text-slate-500">Ainda não há respostas às atividades.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {porQuestao.map(({ questao, aula, respostas: total, taxa }) => (
                    <li key={questao.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{questao.enunciado}</p>
                        <p className="text-xs text-slate-500">
                          {aula ? (
                            <Link href={`/admin/base-conhecimento/${aula.categoria}/${aula.id}`} className="hover:text-blue-600">
                              {aula.titulo}
                            </Link>
                          ) : (
                            "Aula removida"
                          )}{" "}
                          · {total} resposta(s)
                        </p>
                      </div>
                      <div className="flex w-full items-center gap-3 sm:w-64">
                        <Barra valor={taxa} rotulo={`${taxa}% de acerto`} />
                        <span className="inline-flex w-20 shrink-0 items-center justify-end gap-1 font-semibold tabular-nums">
                          {taxa < 50 && <TriangleAlert size={14} className="text-red-600" aria-label="Acerto abaixo de 50%" />}
                          {taxa}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
