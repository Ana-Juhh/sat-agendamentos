"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { pb } from "@/lib/pocketbase";
import { PROGRESSO_WIKI, ProgressoWiki } from "@/lib/wiki";

// Progresso da pessoa logada nas páginas de uma categoria da Wiki. Fica no
// PocketBase (collection progresso_wiki) pra aparecer no painel de
// acompanhamento. O servidor garante que cada um só grava o próprio.
export default function useProgressoWiki(categoriaId: string, ativo: boolean) {
  const [registros, setRegistros] = useState<Record<string, ProgressoWiki>>({});
  const registrosRef = useRef(registros);
  const visitasRegistradas = useRef(new Set<string>());

  const carregar = useCallback(async () => {
    const usuarioId = pb.authStore.model?.id;
    if (!usuarioId || !categoriaId) return {};
    const lista = await pb.collection(PROGRESSO_WIKI).getFullList<ProgressoWiki>({
      filter: pb.filter("usuario = {:usuario} && pagina.categoria = {:categoria}", {
        usuario: usuarioId,
        categoria: categoriaId,
      }),
      requestKey: null,
    });
    const mapa = Object.fromEntries(lista.map((item) => [item.pagina, item]));
    registrosRef.current = mapa;
    setRegistros(mapa);
    return mapa;
  }, [categoriaId]);

  useEffect(() => {
    if (!ativo) return;
    async function iniciar() {
      try {
        await carregar();
      } catch (error) {
        console.error("Erro ao carregar progresso da Wiki:", error);
      }
    }
    void iniciar();
  }, [ativo, carregar]);

  const salvar = useCallback(async (paginaId: string, dados: Partial<ProgressoWiki>) => {
    const existente = registrosRef.current[paginaId];
    const salvo = existente
      ? await pb.collection(PROGRESSO_WIKI).update<ProgressoWiki>(existente.id, dados)
      : await pb.collection(PROGRESSO_WIKI).create<ProgressoWiki>({ pagina: paginaId, ...dados });
    registrosRef.current = { ...registrosRef.current, [paginaId]: salvo };
    setRegistros(registrosRef.current);
    return salvo;
  }, []);

  // Conta uma visita por abertura de página (e não a cada re-render).
  const registrarVisita = useCallback(
    async (paginaId: string) => {
      if (visitasRegistradas.current.has(paginaId)) return;
      visitasRegistradas.current.add(paginaId);
      const agora = new Date().toISOString();
      try {
        const mapa = await carregar();
        const existente = mapa[paginaId];
        await salvar(paginaId, {
          visitas: (existente?.visitas || 0) + 1,
          ultima_visita: agora,
          ...(existente?.primeira_visita ? {} : { primeira_visita: agora }),
        });
      } catch (error) {
        console.error("Erro ao registrar visita na Wiki:", error);
      }
    },
    [carregar, salvar]
  );

  const estaConcluida = useCallback(
    (paginaId: string) => Boolean(registros[paginaId]?.concluida),
    [registros]
  );

  const alternar = useCallback(
    async (paginaId: string) => {
      await salvar(paginaId, { concluida: !registrosRef.current[paginaId]?.concluida });
    },
    [salvar]
  );

  return { estaConcluida, alternar, registrarVisita };
}
