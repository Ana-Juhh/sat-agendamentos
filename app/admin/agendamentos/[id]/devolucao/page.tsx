"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import HeaderDashboard from "@/components/HeaderDashboard";
import { AG_COLLECTION } from "@/lib/agendamentoConfig";
import { pb } from "@/lib/pocketbase";
import { canViewAllAgendamentos } from "@/lib/roles";

type Chromebook = {
  id: string;
  codigo?: string;
  status?: string;
};

type Usuario = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

type Agendamento = {
  id: string;
  usuario: string;
  chromebooks: string[];
  chromebooks_devolvidos?: string[];
  data: string;
  inicio: number;
  fim: number;
  status: "ativo" | "cancelado";
  status_entrega?: "pendente" | "em_uso" | "devolvido" | "atrasado";
  turma?: string;
  classe?: string;
  observacoes?: string;
  usuario_nome?: string;
  expand?: {
    usuario?: Usuario;
    chromebooks?: Chromebook[];
    chromebooks_devolvidos?: Chromebook[];
  };
};

type PocketBaseError = {
  data?: {
    message?: string;
  };
  message?: string;
};

function normalizarDataISO(v: string) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return v.slice(0, 10);
}

function formatarDataBR(dataISO: string) {
  const iso = normalizarDataISO(dataISO);
  const [ano, mes, dia] = iso.split("-");

  if (!ano || !mes || !dia) return dataISO || "-";

  return `${dia}/${mes}/${ano}`;
}

function normalizarReturnTo(value: string | null) {
  if (!value) return "/admin";

  try {
    const decoded = decodeURIComponent(value);

    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return "/admin";
    }

    return decoded;
  } catch {
    return "/admin";
  }
}

export default function DevolucaoAgendamentoPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = normalizarReturnTo(searchParams.get("returnTo"));

  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [devolvidosSelecionados, setDevolvidosSelecionados] = useState<string[]>(
    []
  );

  useEffect(() => {
    const model = pb.authStore.model as { role?: string } | null;

    setRole(model?.role ?? null);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!pb.authStore.isValid) {
      router.push("/login");
      return;
    }

    if (!canViewAllAgendamentos(role)) {
      router.push("/dashboard");
      return;
    }

    carregar();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, role, id]);

  async function carregar() {
    if (!id) return;

    try {
      setCarregando(true);

      const registro = await pb.collection(AG_COLLECTION).getOne<Agendamento>(id, {
        expand: "usuario,chromebooks,chromebooks_devolvidos",
      });

      setAgendamento(registro);

      const devolvidosIds =
        registro.expand?.chromebooks_devolvidos?.map((c) => c.id) ??
        registro.chromebooks_devolvidos ??
        [];

      setDevolvidosSelecionados(devolvidosIds);
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar devolução");
      router.replace(returnTo);
    } finally {
      setCarregando(false);
    }
  }

  const chromesReservados = useMemo(() => {
    return agendamento?.expand?.chromebooks ?? [];
  }, [agendamento]);

  // Os que já estavam salvos como devolvidos somem da lista principal;
  // só os pendentes aparecem pra marcar.
  const idsJaDevolvidos = useMemo(() => {
    return new Set(agendamento?.chromebooks_devolvidos ?? []);
  }, [agendamento]);

  const chromesPendentes = useMemo(() => {
    return chromesReservados.filter((c) => !idsJaDevolvidos.has(c.id));
  }, [chromesReservados, idsJaDevolvidos]);

  const chromesJaDevolvidos = useMemo(() => {
    return chromesReservados.filter((c) => idsJaDevolvidos.has(c.id));
  }, [chromesReservados, idsJaDevolvidos]);

  const marcadosAgora = devolvidosSelecionados.filter(
    (chromeId) => !idsJaDevolvidos.has(chromeId)
  ).length;

  const aindaFaltam = chromesReservados.filter(
    (c) => !devolvidosSelecionados.includes(c.id)
  ).length;

  const nomeUsuario = useMemo(() => {
    if (!agendamento) return "-";

    return (
      agendamento.expand?.usuario?.name ||
      agendamento.usuario_nome ||
      agendamento.expand?.usuario?.email ||
      "Usuário sem nome"
    );
  }, [agendamento]);

  function voltarParaOrigem() {
    router.replace(returnTo);
  }

  function toggleDevolvido(chromeId: string) {
    setDevolvidosSelecionados((prev) => {
      if (prev.includes(chromeId)) {
        return prev.filter((itemId) => itemId !== chromeId);
      }

      return [...prev, chromeId];
    });
  }

  async function salvarDevolucao() {
    if (!agendamento) return;

    setSalvando(true);

    try {
      const total = agendamento.chromebooks.length;
      const devolvidos = devolvidosSelecionados.length;

      let statusEntrega: "pendente" | "em_uso" | "devolvido" | "atrasado" =
        "pendente";

      if (devolvidos === 0) {
        statusEntrega = "em_uso";
      } else if (devolvidos < total) {
        statusEntrega = "em_uso";
      } else {
        statusEntrega = "devolvido";
      }

      await pb.collection(AG_COLLECTION).update(agendamento.id, {
        chromebooks_devolvidos: devolvidosSelecionados,
        status_entrega: statusEntrega,
      });

      alert("Devolução atualizada");
      router.replace(returnTo);
    } catch (e: unknown) {
      const erro = e as PocketBaseError;

      console.error(e);
      alert(erro?.data?.message || erro?.message || "Erro ao salvar devolução");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <HeaderDashboard />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Devolução de Chromebooks</h1>
            <p className="mt-1 text-sm text-gray-500">
              Marque quais Chromebooks já foram devolvidos e salve para voltar à
              lista anterior.
            </p>
          </div>

          <button
            type="button"
            onClick={voltarParaOrigem}
            className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
          >
            Voltar
          </button>
        </div>

        {carregando || !agendamento ? (
          <div className="text-center py-20 text-gray-500">Carregando...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <b>Professor(a):</b> {nomeUsuario}
              </div>

              <div>
                <b>Data:</b> {formatarDataBR(agendamento.data)}
              </div>

              <div>
                <b>Turma:</b>{" "}
                {agendamento.turma
                  ? `${agendamento.turma}${
                      agendamento.classe ? ` ${agendamento.classe}` : ""
                    }`
                  : "-"}
              </div>

              {agendamento.observacoes ? (
                <div>
                  <b>Observações:</b> {agendamento.observacoes}
                </div>
              ) : null}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">
                Chromebooks pendentes ({chromesPendentes.length})
              </h2>

              {chromesPendentes.length === 0 ? (
                <p className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                  Todos os Chromebooks deste agendamento já foram devolvidos.
                </p>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {chromesPendentes.map((chromebook) => {
                  const marcado = devolvidosSelecionados.includes(chromebook.id);

                  return (
                    <button
                      key={chromebook.id}
                      type="button"
                      onClick={() => toggleDevolvido(chromebook.id)}
                      className={`border rounded-xl p-4 text-left transition ${
                        marcado
                          ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                          : "border-slate-500 bg-slate-700 text-white hover:border-slate-400 hover:bg-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {chromebook.codigo || chromebook.id}
                          </p>

                          <p className="text-sm text-slate-200">
                            {marcado
                              ? "Marcado como devolvido"
                              : "Ainda não devolvido"}
                          </p>
                        </div>

                        {marcado ? (
                          <span className="rounded-full bg-blue-700 text-white px-3 py-1 text-sm font-semibold">
                            Devolvido
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-600 text-white px-3 py-1 text-sm font-semibold">
                            Pendente
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {chromesJaDevolvidos.length > 0 ? (
                <details className="mt-4 rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
                  <summary className="cursor-pointer font-semibold">
                    Já devolvidos ({chromesJaDevolvidos.length})
                  </summary>

                  <p className="mt-2 text-gray-500">
                    Marcou errado? Clique no Chromebook para voltar ele para
                    pendente e salve.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {chromesJaDevolvidos.map((chromebook) => {
                      const desfeito = !devolvidosSelecionados.includes(
                        chromebook.id
                      );

                      return (
                        <button
                          key={chromebook.id}
                          type="button"
                          onClick={() => toggleDevolvido(chromebook.id)}
                          className={`rounded-full px-3 py-1 font-semibold transition ${
                            desfeito
                              ? "bg-slate-600 text-white line-through"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {chromebook.codigo || chromebook.id}
                        </button>
                      );
                    })}
                  </div>
                </details>
              ) : null}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
              <p>
                <b>Total reservados:</b> {chromesReservados.length}
              </p>

              <p>
                <b>Já devolvidos antes:</b> {chromesJaDevolvidos.length}
              </p>

              <p>
                <b>Marcados agora:</b> {marcadosAgora}
              </p>

              <p>
                <b>Ainda faltam devolver:</b> {aindaFaltam}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={voltarParaOrigem}
                className="px-5 py-3 rounded-xl border hover:bg-gray-50 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salvarDevolucao}
                disabled={salvando}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar devolução"}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
