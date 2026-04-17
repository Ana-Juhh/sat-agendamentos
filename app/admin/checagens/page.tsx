"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import HeaderDashboard from "@/components/HeaderDashboard";
import { pb } from "@/lib/pocketbase";
import { canViewAdminReports } from "@/lib/roles";
import BackButton from "@/components/BackButton";

type Relatorio = {
  id: string;
  carrinho?: string;
  turno?: string;
  verificadoEm?: string;
  dataReferencia?: string;
  totalChromebooks?: number;
  totalVerificados?: number;
  totalComProblema?: number;
  expand?: {
    verificadoPor?: {
      id?: string;
      name?: string;
      nome?: string;
      email?: string;
    };
  };
};

type RelatorioItem = {
  id: string;
  relatorio?: string;
  chromebook?: string;
  verificado?: boolean;
  statusEncontrado?: string;
  observacao?: string;
  foto?: string;
};

type Chromebook = {
  id: string;
  codigo?: string;
  carrinho?: string;
  posicao?: number;
};

export default function RelatoriosChecagemPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [itensPorRelatorio, setItensPorRelatorio] = useState<Record<string, RelatorioItem[]>>({});
  const [chromebooksMap, setChromebooksMap] = useState<Record<string, Chromebook>>({});
  const [abertoId, setAbertoId] = useState<string | null>(null);

  useEffect(() => {
    const model = pb.authStore.model as { role?: string } | null;

    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }

    if (!canViewAdminReports(model?.role)) {
      router.replace("/dashboard");
      return;
    }

    carregar();
  }, [router]);

  async function carregar() {
    try {
      setLoading(true);

      const [dadosRelatorios, dadosItens, dadosChromebooks] = await Promise.all([
        pb.collection("relatorios_checagem").getFullList<Relatorio>({
          expand: "verificadoPor",
          sort: "-verificadoEm,-created",
        }),
        pb.collection("relatorio_itens").getFullList<RelatorioItem>({
          sort: "-created",
        }),
        pb.collection("chromebooks").getFullList<Chromebook>({
          sort: "codigo",
        }),
      ]);

      const mapaChromebooks: Record<string, Chromebook> = {};
      for (const chrome of dadosChromebooks) {
        mapaChromebooks[chrome.id] = chrome;
      }

      const agrupados: Record<string, RelatorioItem[]> = {};
      for (const item of dadosItens) {
        if (!item.relatorio) continue;
        if (!agrupados[item.relatorio]) {
          agrupados[item.relatorio] = [];
        }
        agrupados[item.relatorio].push(item);
      }

      setChromebooksMap(mapaChromebooks);
      setItensPorRelatorio(agrupados);
      setRelatorios(dadosRelatorios);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  }

  async function limparRelatorios() {
    const confirmar = confirm("Tem certeza que deseja apagar todos os relatórios e itens?");
    if (!confirmar) return;

    try {
      const [dadosRelatorios, dadosItens] = await Promise.all([
        pb.collection("relatorios_checagem").getFullList<Relatorio>(),
        pb.collection("relatorio_itens").getFullList<RelatorioItem>(),
      ]);

      for (const item of dadosItens) {
        await pb.collection("relatorio_itens").delete(item.id);
      }

      for (const relatorio of dadosRelatorios) {
        await pb.collection("relatorios_checagem").delete(relatorio.id);
      }

      alert("Relatórios apagados com sucesso!");
      carregar();
    } catch (err) {
      console.error(err);
      alert("Erro ao limpar relatórios");
    }
  }

  function toggleDetalhes(id: string) {
    setAbertoId((prev) => (prev === id ? null : id));
  }

  function getFotoUrl(item: RelatorioItem) {
    if (!item.foto) return null;
    return pb.files.getURL(item, item.foto);
  }

  if (loading) {
    return (
      <>
        <HeaderDashboard />
        <div className="max-w-6xl mx-auto py-16 px-4">
          <BackButton href="/dashboard" />
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            Carregando relatórios...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-6xl mx-auto py-12 px-4">
         <BackButton href="/admin" />
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Relatórios de checagem</h1>
          <p className="text-gray-500 mt-2">
            Veja os carrinhos checados e abra os detalhes quando precisar.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={limparRelatorios}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-medium transition"
          >
            <Trash2 size={18} />
            Limpar relatórios
          </button>
        </div>

        {relatorios.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            Nenhum relatório encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {relatorios.map((relatorio) => {
              const responsavel =
                relatorio.expand?.verificadoPor?.name ||
                relatorio.expand?.verificadoPor?.nome ||
                relatorio.expand?.verificadoPor?.email ||
                "-";

              const itens = itensPorRelatorio[relatorio.id] || [];
              const aberto = abertoId === relatorio.id;

              return (
                <div
                  key={relatorio.id}
                  className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1 rounded-full text-sm font-medium mb-3">
                          <ClipboardList size={16} />
                          Carrinho {relatorio.carrinho || "-"}
                        </div>

                        <h2 className="text-2xl font-semibold text-slate-900">
                          {relatorio.turno === "manha" ? "Manhã" : "Tarde"}
                        </h2>

                        <p className="text-sm text-gray-500 mt-2">
                          {relatorio.verificadoEm
                            ? new Date(relatorio.verificadoEm).toLocaleString("pt-BR")
                            : "-"}
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          Responsável: {responsavel}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-2xl px-4 py-3 text-center">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-xl font-bold">{relatorio.totalChromebooks || 0}</p>
                        </div>

                        <div className="bg-green-50 rounded-2xl px-4 py-3 text-center">
                          <p className="text-xs text-green-700">Verificados</p>
                          <p className="text-xl font-bold text-green-700">
                            {relatorio.totalVerificados || 0}
                          </p>
                        </div>

                        <div className="bg-purple-100/70 text-purple-800 rounded-2xl px-4 py-3 text-center">
                          <p className="text-xs text-red-700">Problemas</p>
                          <p className="text-xl font-bold text-red-700">
                            {relatorio.totalComProblema || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        onClick={() => toggleDetalhes(relatorio.id)}
                        className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
                      >
                        {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        {aberto ? "Ocultar detalhes" : "Mais detalhes"}
                      </button>
                    </div>
                  </div>

                  {aberto && (
                    <div className="border-t border-gray-100 bg-slate-50 px-5 md:px-6 py-5">
                      {itens.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum item encontrado neste relatório.</p>
                      ) : (
                        <div className="space-y-3">
                          {itens.map((item) => {
                            const chrome = item.chromebook
                              ? chromebooksMap[item.chromebook]
                              : undefined;

                            const fotoUrl = getFotoUrl(item);

                            return (
                              <div
                                key={item.id}
                                className="bg-white rounded-2xl border border-gray-100 p-4"
                              >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-slate-900">
                                      {chrome?.codigo || "Sem código"}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Carrinho {chrome?.carrinho || relatorio.carrinho || "-"} •
                                      Posição {chrome?.posicao ?? "-"}
                                    </p>
                                  </div>

                                  <div className="text-sm">
                                    <p>
                                      <strong>Verificado:</strong> {item.verificado ? "Sim" : "Não"}
                                    </p>
                                    <p>
                                      <strong>Status:</strong> {item.statusEncontrado || "ok"}
                                    </p>
                                  </div>
                                </div>

                                {item.observacao && (
                                  <div className="mt-3">
                                    <p className="text-sm font-medium text-slate-700">Observação</p>
                                    <p className="text-sm text-gray-700 mt-1">{item.observacao}</p>
                                  </div>
                                )}

                                {fotoUrl && (
                                  <div className="mt-3">
                                    <p className="text-sm font-medium text-slate-700 mb-2">
                                      Foto do problema
                                    </p>
                                    <img
                                      src={fotoUrl}
                                      alt="Foto do problema"
                                      className="max-w-xs rounded-2xl border"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
