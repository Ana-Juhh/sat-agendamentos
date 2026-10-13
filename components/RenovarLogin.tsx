"use client";

import { useEffect } from "react";
import { ClientResponseError } from "pocketbase";

import { pb } from "@/lib/pocketbase";

// Renova o login no PocketBase enquanto a pessoa usa o site, pra não precisar
// entrar de novo a cada poucos dias. O token vale 30 dias (migração
// 1780500000) e é renovado ao abrir o site, a cada 6 horas e quando a aba volta
// a ficar ativa (no máximo uma vez por hora). Se o servidor recusar (conta
// removida ou token vencido), sai do login; se for só falta de rede, mantém.
const INTERVALO_MS = 6 * 60 * 60 * 1000;
const MINIMO_ENTRE_RENOVACOES_MS = 60 * 60 * 1000;

export default function RenovarLogin() {
  useEffect(() => {
    let ultimaRenovacao = 0;
    let renovando = false;

    async function renovar() {
      const model = pb.authStore.model as { collectionName?: string } | null;
      if (!pb.authStore.isValid || model?.collectionName !== "users") return;
      if (renovando || Date.now() - ultimaRenovacao < MINIMO_ENTRE_RENOVACOES_MS) return;

      renovando = true;
      try {
        await pb.collection("users").authRefresh({ requestKey: null });
        ultimaRenovacao = Date.now();
      } catch (error) {
        if (error instanceof ClientResponseError && (error.status === 401 || error.status === 403 || error.status === 404)) {
          pb.authStore.clear();
        }
      } finally {
        renovando = false;
      }
    }

    function aoVoltarParaAba() {
      if (document.visibilityState === "visible") void renovar();
    }

    void renovar();
    const intervalo = window.setInterval(renovar, INTERVALO_MS);
    document.addEventListener("visibilitychange", aoVoltarParaAba);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltarParaAba);
    };
  }, []);

  return null;
}
