"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Recarrega o site quando sai uma versão nova, pra ninguém ficar com telas
// antigas (ex.: opção que já foi removida) por ter deixado a aba aberta.
//
// Confere /versao (fora de /api/, que no servidor vai pro PocketBase) ao
// abrir, a cada 5 minutos e quando a aba volta a ficar ativa. Pra não apagar um formulário pela metade, só recarrega:
// - logo ao abrir o site (ninguém digitou nada ainda);
// - quando a pessoa troca de página; ou
// - quando volta pra aba depois de ter saído dela.
const VERSAO_ATUAL = process.env.NEXT_PUBLIC_VERSAO || "";
const INTERVALO_MS = 5 * 60 * 1000;
const CHAVE_RECARGA = "sat:recarregou-para-versao";

function recarregarPara(versao: string) {
  // Evita ficar recarregando sem parar se algo no caminho insistir em
  // entregar a versão antiga: tenta uma vez por versão nova.
  try {
    if (window.sessionStorage.getItem(CHAVE_RECARGA) === versao) return;
    window.sessionStorage.setItem(CHAVE_RECARGA, versao);
  } catch {
    // sem sessionStorage: recarrega mesmo assim
  }
  window.location.reload();
}

async function versaoDoServidor() {
  try {
    const resposta = await fetch("/versao", { cache: "no-store" });
    if (!resposta.ok) return null;
    const dados = (await resposta.json()) as { versao?: string };
    return dados.versao || null;
  } catch {
    return null;
  }
}

export default function VerificarVersao() {
  const pathname = usePathname();
  const pendente = useRef<string | null>(null);
  const primeiroCaminho = useRef(pathname);

  useEffect(() => {
    if (!VERSAO_ATUAL) return;
    let abertoAgora = true;

    async function conferir() {
      const versao = await versaoDoServidor();
      if (!versao || versao === VERSAO_ATUAL) return;

      if (abertoAgora) recarregarPara(versao);
      else pendente.current = versao;
    }

    function aoMudarVisibilidade() {
      if (document.visibilityState !== "visible") return;
      if (pendente.current) recarregarPara(pendente.current);
      else void conferir();
    }

    void conferir().finally(() => {
      abertoAgora = false;
    });
    const intervalo = window.setInterval(conferir, INTERVALO_MS);
    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, []);

  // Trocou de página com versão nova pendente: recarrega já na página nova.
  useEffect(() => {
    if (pathname === primeiroCaminho.current) return;
    primeiroCaminho.current = pathname;
    if (pendente.current) recarregarPara(pendente.current);
  }, [pathname]);

  return null;
}
