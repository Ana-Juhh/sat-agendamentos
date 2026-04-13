"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderDashboard from "@/components/HeaderDashboard";
import { pb } from "@/lib/pocketbase";

type ChromebookStatus =
  | "disponivel"
  | "indisponivel"
  | "em_uso"
  | "manutencao";

type ChromebookTipo = "agendamento" | "carrinho";

type Chromebook = {
  id: string;
  codigo: string;
  status: ChromebookStatus;
  tipo?: ChromebookTipo;
  carrinho?: string;
  posicao?: number | null;
};

const STATUS_OPTIONS: ChromebookStatus[] = [
  "disponivel",
  "indisponivel",
  "em_uso",
  "manutencao",
];

const TIPO_OPTIONS: ChromebookTipo[] = ["agendamento", "carrinho"];

export default function AdminEquipamentosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [chromebooks, setChromebooks] = useState<Chromebook[]>([]);

  const [filtroTipo, setFiltroTipo] = useState<"todos" | "agendamento" | "carrinho">("todos");
  const [filtroCarrinho, setFiltroCarrinho] = useState<string>("todos");

  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoStatus, setNovoStatus] = useState<ChromebookStatus>("disponivel");
  const [novoTipo, setNovoTipo] = useState<ChromebookTipo>("agendamento");
  const [novoCarrinho, setNovoCarrinho] = useState("");
  const [novaPosicao, setNovaPosicao] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editCodigo, setEditCodigo] = useState("");
  const [editStatus, setEditStatus] = useState<ChromebookStatus>("disponivel");
  const [editTipo, setEditTipo] = useState<ChromebookTipo>("agendamento");
  const [editCarrinho, setEditCarrinho] = useState("");
  const [editPosicao, setEditPosicao] = useState("");

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

      const dados = await pb.collection("chromebooks").getFullList<Chromebook>({
        sort: "codigo",
      });

      setChromebooks(dados);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar chromebooks");
    } finally {
      setLoading(false);
    }
  }

  const carrinhosDisponiveis = useMemo(() => {
    const lista = Array.from(
      new Set(
        chromebooks
          .filter((c) => (c.tipo || "agendamento") === "carrinho" && c.carrinho)
          .map((c) => c.carrinho as string)
      )
    ).sort((a, b) => Number(a) - Number(b));

    return lista;
  }, [chromebooks]);

  const chromebooksFiltrados = useMemo(() => {
    let lista = [...chromebooks];

    if (filtroTipo !== "todos") {
      lista = lista.filter((c) => (c.tipo || "agendamento") === filtroTipo);
    }

    if (filtroCarrinho !== "todos") {
      lista = lista.filter((c) => (c.carrinho || "") === filtroCarrinho);
    }

    return lista;
  }, [chromebooks, filtroTipo, filtroCarrinho]);

  const totalPorStatus = useMemo(() => {
    return chromebooksFiltrados.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [chromebooksFiltrados]);

  const codigoPreview =
    novoTipo === "carrinho" && novoCarrinho && novaPosicao
      ? `C${novoCarrinho}-${String(novaPosicao).padStart(2, "0")}`
      : "";

  const editCodigoPreview =
    editTipo === "carrinho" && editCarrinho && editPosicao
      ? `C${editCarrinho}-${String(editPosicao).padStart(2, "0")}`
      : "";

  async function adicionarChromebook(e: React.FormEvent) {
    e.preventDefault();

    let codigoFinal = novoCodigo.trim();

    if (novoTipo === "carrinho") {
      if (!novoCarrinho || !novaPosicao) {
        alert("Preencha carrinho e posição");
        return;
      }

      codigoFinal = `C${novoCarrinho}-${String(novaPosicao).padStart(2, "0")}`;
    }

    if (!codigoFinal) {
      alert("Digite o código do chromebook");
      return;
    }

    setSalvando(true);
    try {
      const criado = await pb.collection("chromebooks").create<Chromebook>({
        codigo: codigoFinal,
        status: novoStatus,
        tipo: novoTipo,
        carrinho: novoTipo === "carrinho" ? novoCarrinho : "",
        posicao: novoTipo === "carrinho" ? Number(novaPosicao) : null,
      });

      setChromebooks((prev) =>
        [...prev, criado].sort((a, b) => a.codigo.localeCompare(b.codigo))
      );

      setNovoCodigo("");
      setNovoStatus("disponivel");
      setNovoTipo("agendamento");
      setNovoCarrinho("");
      setNovaPosicao("");
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.message || err?.message || "Erro ao adicionar chromebook");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(chrome: Chromebook) {
    setEditandoId(chrome.id);
    setEditCodigo(chrome.codigo);
    setEditStatus(chrome.status);
    setEditTipo(chrome.tipo || "agendamento");
    setEditCarrinho(chrome.carrinho || "");
    setEditPosicao(
      chrome.posicao === null || chrome.posicao === undefined
        ? ""
        : String(chrome.posicao)
    );
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditCodigo("");
    setEditStatus("disponivel");
    setEditTipo("agendamento");
    setEditCarrinho("");
    setEditPosicao("");
  }

  async function salvarEdicao(id: string) {
    let codigoFinal = editCodigo.trim();

    if (editTipo === "carrinho") {
      if (!editCarrinho || !editPosicao) {
        alert("Preencha carrinho e posição");
        return;
      }

      codigoFinal = `C${editCarrinho}-${String(editPosicao).padStart(2, "0")}`;
    }

    if (!codigoFinal) {
      alert("O código não pode ficar vazio");
      return;
    }

    setSalvando(true);
    try {
      const atualizado = await pb.collection("chromebooks").update<Chromebook>(id, {
        codigo: codigoFinal,
        status: editStatus,
        tipo: editTipo,
        carrinho: editTipo === "carrinho" ? editCarrinho : "",
        posicao: editTipo === "carrinho" ? Number(editPosicao) : null,
      });

      setChromebooks((prev) =>
        prev
          .map((c) => (c.id === id ? atualizado : c))
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
      );

      cancelarEdicao();
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.message || err?.message || "Erro ao salvar edição");
    } finally {
      setSalvando(false);
    }
  }

  async function trocarStatus(chrome: Chromebook, status: ChromebookStatus) {
    try {
      const atualizado = await pb.collection("chromebooks").update<Chromebook>(chrome.id, {
        status,
      });

      setChromebooks((prev) =>
        prev
          .map((c) => (c.id === chrome.id ? atualizado : c))
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
      );
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.message || err?.message || "Erro ao atualizar status");
    }
  }

  async function excluirChromebook(id: string) {
    if (!confirm("Tem certeza que deseja excluir este chromebook?")) return;

    try {
      await pb.collection("chromebooks").delete(id);
      setChromebooks((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.message || err?.message || "Erro ao excluir chromebook");
    }
  }

  function statusClass(status: ChromebookStatus) {
    switch (status) {
      case "disponivel":
        return "text-green-700 bg-green-50";
      case "indisponivel":
        return "text-gray-700 bg-gray-100";
      case "em_uso":
        return "text-orange-700 bg-orange-50";
      case "manutencao":
        return "text-red-700 bg-red-50";
      default:
        return "text-gray-700 bg-gray-100";
    }
  }

  function tipoLabel(tipo?: ChromebookTipo) {
    return tipo === "carrinho" ? "Carrinho" : "Agendamento";
  }

  if (loading) {
    return (
      <>
        <HeaderDashboard />
        <div className="max-w-6xl mx-auto py-16 text-center text-gray-500">
          Carregando equipamentos...
        </div>
      </>
    );
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-6xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Gerenciar Equipamentos</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Disponíveis</p>
            <p className="text-2xl font-bold">{totalPorStatus.disponivel || 0}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Indisponíveis</p>
            <p className="text-2xl font-bold">{totalPorStatus.indisponivel || 0}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Em uso</p>
            <p className="text-2xl font-bold">{totalPorStatus.em_uso || 0}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Manutenção</p>
            <p className="text-2xl font-bold">{totalPorStatus.manutencao || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-2">Filtrar por tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) =>
                setFiltroTipo(e.target.value as "todos" | "agendamento" | "carrinho")
              }
              className="w-full border rounded-lg px-4 py-2 bg-white"
            >
              <option value="todos">Todos</option>
              <option value="agendamento">Somente agendamento</option>
              <option value="carrinho">Somente carrinho</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">Filtrar por carrinho</label>
            <select
              value={filtroCarrinho}
              onChange={(e) => setFiltroCarrinho(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 bg-white"
            >
              <option value="todos">Todos os carrinhos</option>
              {carrinhosDisponiveis.map((numero) => (
                <option key={numero} value={numero}>
                  Carrinho {numero}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form
          onSubmit={adicionarChromebook}
          className="bg-white rounded-2xl shadow-sm p-6 mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">Adicionar novo chromebook</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-2">Tipo</label>
              <select
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value as ChromebookTipo)}
                className="w-full border rounded-lg px-4 py-2"
              >
                {TIPO_OPTIONS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipoLabel(tipo)}
                  </option>
                ))}
              </select>
            </div>

            {novoTipo === "agendamento" && (
              <div className="md:col-span-2">
                <label className="block font-medium mb-2">Código</label>
                <input
                  type="text"
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value)}
                  placeholder="Ex.: Chrome-008"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            )}

            {novoTipo === "carrinho" && (
              <>
                <div>
                  <label className="block font-medium mb-2">Carrinho</label>
                  <input
                    type="number"
                    value={novoCarrinho}
                    onChange={(e) => setNovoCarrinho(e.target.value)}
                    placeholder="Ex.: 1"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Posição</label>
                  <input
                    type="number"
                    value={novaPosicao}
                    onChange={(e) => setNovaPosicao(e.target.value)}
                    placeholder="Ex.: 3"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div className="md:col-span-3">
                  <p className="text-sm text-gray-500">
                    Código gerado: <strong>{codigoPreview || "-"}</strong>
                  </p>
                </div>
              </>
            )}

            <div className="md:col-span-3">
              <label className="block font-medium mb-2">Status inicial</label>
              <select
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value as ChromebookStatus)}
                className="w-full border rounded-lg px-4 py-2 bg-white"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Adicionar chromebook"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {chromebooksFiltrados.map((chrome) => {
            const editando = editandoId === chrome.id;

            return (
              <div
                key={chrome.id}
                className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
              >
                {editando ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block font-medium mb-2">Tipo</label>
                      <select
                        value={editTipo}
                        onChange={(e) => setEditTipo(e.target.value as ChromebookTipo)}
                        className="w-full border rounded-lg px-4 py-2 bg-white"
                      >
                        {TIPO_OPTIONS.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipoLabel(tipo)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editTipo === "agendamento" ? (
                      <div className="md:col-span-2">
                        <label className="block font-medium mb-2">Código</label>
                        <input
                          type="text"
                          value={editCodigo}
                          onChange={(e) => setEditCodigo(e.target.value)}
                          className="w-full border rounded-lg px-4 py-2"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block font-medium mb-2">Carrinho</label>
                          <input
                            type="number"
                            value={editCarrinho}
                            onChange={(e) => setEditCarrinho(e.target.value)}
                            className="w-full border rounded-lg px-4 py-2"
                          />
                        </div>

                        <div>
                          <label className="block font-medium mb-2">Posição</label>
                          <input
                            type="number"
                            value={editPosicao}
                            onChange={(e) => setEditPosicao(e.target.value)}
                            className="w-full border rounded-lg px-4 py-2"
                          />
                        </div>

                        <div className="md:col-span-4">
                          <p className="text-sm text-gray-500">
                            Código gerado: <strong>{editCodigoPreview || "-"}</strong>
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block font-medium mb-2">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as ChromebookStatus)}
                        className="w-full border rounded-lg px-4 py-2 bg-white"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4 flex gap-2 justify-end">
                      <button
                        onClick={cancelarEdicao}
                        type="button"
                        className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => salvarEdicao(chrome.id)}
                        type="button"
                        disabled={salvando}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xl font-semibold">{chrome.codigo}</p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusClass(
                            chrome.status
                          )}`}
                        >
                          {chrome.status}
                        </span>

                        <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                          {tipoLabel(chrome.tipo)}
                        </span>

                        {chrome.tipo === "carrinho" && (
                          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                            Carrinho {chrome.carrinho || "-"} • Posição {chrome.posicao ?? "-"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => iniciarEdicao(chrome)}
                        className="px-4 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                      >
                        Editar
                      </button>

                      {chrome.status !== "disponivel" && (
                        <button
                          onClick={() => trocarStatus(chrome, "disponivel")}
                          className="px-4 py-2 rounded-lg text-green-700 hover:bg-green-50 transition"
                        >
                          Marcar disponível
                        </button>
                      )}

                      {chrome.status !== "indisponivel" && (
                        <button
                          onClick={() => trocarStatus(chrome, "indisponivel")}
                          className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                        >
                          Indisponível
                        </button>
                      )}

                      {chrome.status !== "manutencao" && (
                        <button
                          onClick={() => trocarStatus(chrome, "manutencao")}
                          className="px-4 py-2 rounded-lg text-red-700 hover:bg-red-50 transition"
                        >
                          Manutenção
                        </button>
                      )}

                      <button
                        onClick={() => excluirChromebook(chrome.id)}
                        className="px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {chromebooksFiltrados.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-2xl shadow-sm">
              Nenhum chromebook encontrado com esse filtro.
            </div>
          )}
        </div>
      </div>
    </>
  );
}