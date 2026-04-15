"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import HeaderDashboard from "@/components/HeaderDashboard";
import { pb } from "@/lib/pocketbase";
import { canCheckCarrinhos } from "@/lib/roles";

export default function CarrinhosPage() {
  const router = useRouter();

  const carrinhos = [1, 2, 3, 4, 5];

  useEffect(() => {
    const model = pb.authStore.model as { role?: string } | null;

    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }

    if (!canCheckCarrinhos(model?.role)) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition"
          >
            ← Voltar para dashboard
          </button>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900">
            Checagem dos Carrinhos
          </h1>
          <p className="text-gray-500 mt-2">
            Escolha um carrinho para iniciar ou continuar a checagem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {carrinhos.map((numero) => (
            <Link
              key={numero}
              href={`/checagem/carrinhos/${numero}`}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
            >
              <h2 className="text-2xl font-semibold text-slate-900">
                Carrinho {numero}
              </h2>
              <p className="text-gray-500 mt-3">
                Clique para verificar os chromebooks
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
