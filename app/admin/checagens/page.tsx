"use client";

import { useEffect, useMemo, useState } from "react";
import HeaderDashboard from "@/components/HeaderDashboard";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";

type Checagem = {
  id: string;
  created: string;
  turno?: string;
  verificado?: boolean;
  statusEncontrado?: string;
  observacao?: string;
  verificadoEm?: string;
  foto?: string;
  chromebook?: string;
  verificadoPor?: string;
  expand?: {
    verificadoPor?: {
      email?: string;
      name?: string;
      nome?: string;
    };
  };
};

type Chromebook = {
  id: string;
  codigo?: string;
  carrinho?: string;
  posicao?: number;
  tipo?: string;
};

export default function RelatoriosChecagemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checagens, setChecagens] = useState<Checagem[]>([]);
  const [chromebooksMap, setChromebooksMap] = useState<Record<string, Chromebook>>({});
  const [abertoId, setAbertoId] = useState<string | null>(null);

  useEffect(() => {
    const model = pb.authStore.model as { role?: string } | null;

    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }

    if (model?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    carregar();
  }, [router]);

  async function carregar() {
    try {
      setLoading(true);

      const [dadosChecagens, dadosChromebooks] = await Promise.all([
        pb.collection("checagens").getFullList<Checagem>({
          expand: "verificadoPor",
          sort: "-created",
        }),
        pb.collection("chromebooks").getFullList<Chromebook>({
          sort: "codigo",
        }),
      ]);

      const mapa: Record<string, Chromebook> = {};
      for (const chrome of dadosChromebooks) {
        mapa[chrome.id] = chrome;
      }

      setChromebooksMap(mapa);
      setChecagens(dadosChecagens);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar relatórios de checagem");
    } finally {
      setLoading(false);
    }
  }

  async function limparRelatorios() {
    const confirmar = confirm("Tem certeza que deseja apagar todos os relatórios de checagem?");
    if (!confirmar) return;

    try {
      const registros = await pb.collection("checagens").getFullList<Checagem>({
        sort: "-created",
      });

      for (const item of registros) {
        await pb.collection("checagens").delete(item.id);
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

  function getFotoUrl(item: Checagem) {
    if (!item.foto) return null;
    return pb.files.getURL(item, item.foto);
  }

  const relatorios = useMemo(() => {
    return checagens.map((item) => {
      const chromebook = item.chromebook ? chromebooksMap[item.chromebook] : undefined;

      return {
        ...item,
        codigo: chromebook?.codigo || "Sem código",
        carrinho: chromebook?.carrinho || "-",
        posicao: chromebook?.posicao ?? "-",
      };
    });
  }, [checagens, chromebooksMap]);

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-6xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold text-center mb-6">
          Relatórios de checagem
        </h1>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={limparRelatorios}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Limpar relatórios
          </button>

          <button
            disabled
            className="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg cursor-not-allowed"
          >
            Exportar DOCX
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Carregando...</p>
        ) : relatorios.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
            Nenhuma checagem encontrada.
          </div>
        ) : (
          <div className="space-y-4">
            {relatorios.map((item) => {
              const responsavel =
                item.expand?.verificadoPor?.name ||
                item.expand?.verificadoPor?.nome ||
                item.expand?.verificadoPor?.email ||
                "-";

              const fotoUrl = getFotoUrl(item);
              const aberto = abertoId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-xl">{item.codigo}</p>
                      <p className="text-sm text-gray-500">
                        Carrinho: {item.carrinho}
                      </p>
                      <p className="text-sm text-gray-500">
                        Turno: {item.turno || "-"}
                      </p>
                    </div>

                    <div className="text-sm space-y-1">
                      <p>
                        <strong>Status:</strong> {item.statusEncontrado || "ok"}
                      </p>
                      <p>
                        <strong>Verificado:</strong> {item.verificado ? "Sim" : "Não"}
                      </p>
                      <p>
                        <strong>Por:</strong> {responsavel}
                      </p>
                      <p>
                        <strong>Data:</strong>{" "}
                        {item.verificadoEm
                          ? new Date(item.verificadoEm).toLocaleString("pt-BR")
                          : new Date(item.created).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => toggleDetalhes(item.id)}
                      className="text-blue-600 text-sm font-medium hover:underline"
                    >
                      {aberto ? "Ocultar detalhes" : "Mais detalhes"}
                    </button>
                  </div>

                  {aberto && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      <p className="text-sm">
                        <strong>ID do chromebook:</strong> {item.chromebook || "-"}
                      </p>

                      <p className="text-sm">
                        <strong>Posição no carrinho:</strong> {item.posicao}
                      </p>

                      <div>
                        <p className="text-sm font-medium">Observação</p>
                        <p className="text-sm text-gray-700 mt-1">
                          {item.observacao?.trim()
                            ? item.observacao
                            : "Nenhuma observação informada."}
                        </p>
                      </div>

                      {fotoUrl && (
                        <div>
                          <p className="text-sm font-medium mb-2">Foto do problema</p>
                          <img
                            src={fotoUrl}
                            alt="Foto do problema"
                            className="max-w-xs rounded-xl border"
                          />
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