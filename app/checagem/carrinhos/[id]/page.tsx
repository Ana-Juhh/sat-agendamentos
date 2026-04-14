"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Save, ListChecks } from "lucide-react";
import HeaderDashboard from "@/components/HeaderDashboard";
import { pb } from "@/lib/pocketbase";

type Chromebook = {
  id: string;
  codigo: string;
  carrinho: string;
  posicao?: number;
};

const STATUS_OPTIONS = [
  "ok",
  "tela_quebrada",
  "nao_liga",
  "teclado_com_defeito",
  "carregamento_com_defeito",
  "outro",
];

type FormItem = {
  verificado: boolean;
  mostrarProblema: boolean;
  status: string;
  observacao: string;
  foto: File | null;
};

export default function CarrinhoPage() {
  const params = useParams();
  const carrinhoId = params.id as string;

  const [chromebooks, setChromebooks] = useState<Chromebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState<Record<string, FormItem>>({});

  const user = pb.authStore.model as { id?: string; role?: string } | null;

  useEffect(() => {
    carregar();
  }, [carrinhoId]);

  async function carregar() {
    try {
      setLoading(true);

      const lista = await pb.collection("chromebooks").getFullList<Chromebook>({
        filter: `tipo = "carrinho" && carrinho = "${carrinhoId}"`,
        sort: "posicao",
      });

      setChromebooks(lista);

      const inicial: Record<string, FormItem> = {};
      lista.forEach((c) => {
        inicial[c.id] = {
          verificado: false,
          mostrarProblema: false,
          status: "ok",
          observacao: "",
          foto: null,
        };
      });

      setFormData(inicial);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar chromebooks");
    } finally {
      setLoading(false);
    }
  }

  function marcarTodos() {
    setFormData((prev) => {
      const atualizado = { ...prev };

      Object.keys(atualizado).forEach((id) => {
        atualizado[id] = {
          ...atualizado[id],
          verificado: true,
        };
      });

      return atualizado;
    });
  }

  function toggleProblema(id: string) {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        mostrarProblema: !prev[id].mostrarProblema,
      },
    }));
  }

  function atualizarCampo<K extends keyof FormItem>(
    id: string,
    campo: K,
    valor: FormItem[K]
  ) {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor,
      },
    }));
  }

  async function salvarTudo(acao: "voltar" | "proximo" | "finalizar") {
    try {
      setSalvando(true);

      const agora = new Date();
      const hora = agora.getHours();
      const turno = hora < 13 ? "manha" : "tarde";

      const totalChromebooks = chromebooks.length;

      const totalVerificados = Object.values(formData).filter(
        (d) => d.verificado
      ).length;

      const totalComProblema = Object.values(formData).filter(
        (d) => d.mostrarProblema && d.status !== "ok"
      ).length;

      const relatorio = await pb.collection("relatorios_checagem").create({
        carrinho: carrinhoId,
        turno,
        verificadoPor: user?.id,
        verificadoEm: agora.toISOString(),
        dataReferencia: agora.toISOString(),
        totalChromebooks,
        totalVerificados,
        totalComProblema,
      });

      for (const chrome of chromebooks) {
        const dados = formData[chrome.id];
        if (!dados) continue;

        const form = new FormData();
        form.append("relatorio", relatorio.id);
        form.append("chromebook", chrome.id);
        form.append("verificado", String(dados.verificado));
        form.append("statusEncontrado", dados.status);
        form.append("observacao", dados.observacao);

        if (dados.foto) {
          form.append("foto", dados.foto);
        }

        await pb.collection("relatorio_itens").create(form);
      }

      alert("Checagem salva com sucesso!");

      const carrinhoAtual = Number(carrinhoId);
      const proximo = carrinhoAtual + 1;

      if (acao === "voltar") {
        window.location.href = "/checagem/carrinhos";
        return;
      }

      if (acao === "proximo") {
        if (proximo <= 5) {
          window.location.href = `/checagem/carrinhos/${proximo}`;
        } else {
          window.location.href = "/checagem/carrinhos";
        }
        return;
      }

      if (acao === "finalizar") {
        window.location.href = "/admin/checagens";
        return;
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar checagem");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <>
        <HeaderDashboard />
        <div className="max-w-5xl mx-auto py-16 px-4">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            Carregando checagem...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Carrinho {carrinhoId}
          </h1>
          <p className="text-gray-500 mt-2">
            Marque os chromebooks verificados e relate problemas apenas quando necessário.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-gray-600">
              <ListChecks size={20} />
              <span className="font-medium">
                {chromebooks.length} chromebook{chromebooks.length === 1 ? "" : "s"} neste carrinho
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={marcarTodos}
                type="button"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition"
              >
                <CheckCircle2 size={18} />
                Marcar todos
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {chromebooks.map((c) => {
            const dados = formData[c.id];

            return (
              <div
                key={c.id}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        {c.codigo}
                      </h2>
                      <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                        Posição {c.posicao ?? "-"}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 md:items-center">
                      <label className="inline-flex items-center px-4 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          className="h-5 w-5 mr-3 accent-blue-600"
                          checked={dados?.verificado || false}
                          onChange={(e) =>
                            atualizarCampo(c.id, "verificado", e.target.checked)
                          }
                        />
                        <span className="font-medium text-slate-800">
                          Verificado
                        </span>
                      </label>

                      <button
                        onClick={() => toggleProblema(c.id)}
                        type="button"
                        className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition ${
                          dados?.mostrarProblema
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        <AlertTriangle size={18} />
                        {dados?.mostrarProblema
                          ? "Ocultar problema"
                          : "Relatar problema"}
                      </button>
                    </div>
                  </div>
                </div>

                {dados?.mostrarProblema && (
                  <div className="border-t border-gray-100 bg-slate-50 px-5 md:px-6 py-5">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Status encontrado
                        </label>
                        <select
                          value={dados.status}
                          onChange={(e) =>
                            atualizarCampo(c.id, "status", e.target.value)
                          }
                          className="w-full border border-gray-200 rounded-2xl px-4 py-3 bg-white"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Observação
                        </label>
                        <textarea
                          placeholder="Descreva o problema encontrado..."
                          value={dados.observacao}
                          onChange={(e) =>
                            atualizarCampo(c.id, "observacao", e.target.value)
                          }
                          className="w-full border border-gray-200 rounded-2xl px-4 py-3 min-h-[110px] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Foto do problema
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            atualizarCampo(c.id, "foto", e.target.files?.[0] || null)
                          }
                          className="w-full border border-gray-200 rounded-2xl px-4 py-3 bg-white file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {chromebooks.length === 0 && (
          <div className="mt-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            Nenhum chromebook encontrado neste carrinho.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-end">
          <button
            onClick={() => salvarTudo("voltar")}
            disabled={salvando}
            className="px-4 py-3 rounded-2xl bg-gray-200 hover:bg-gray-300 font-medium disabled:opacity-50"
          >
            Salvar e voltar
          </button>

          <button
            onClick={() => salvarTudo("proximo")}
            disabled={salvando}
            className="px-4 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50"
          >
            Próximo carrinho →
          </button>

          <button
            onClick={() => salvarTudo("finalizar")}
            disabled={salvando}
            className="px-4 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
          >
            Finalizar checagem
          </button>
        </div>
      </div>
    </>
  );
}