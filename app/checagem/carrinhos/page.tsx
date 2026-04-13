"use client";

import Link from "next/link";
import HeaderDashboard from "@/components/HeaderDashboard";

export default function CarrinhosPage() {
  const carrinhos = [1, 2, 3, 4, 5];

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-5xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold text-center mb-10">
          Checagem dos Carrinhos
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {carrinhos.map((numero) => (
            <Link
              key={numero}
              href={`/checagem/carrinhos/${numero}`}
              className="bg-white rounded-2xl shadow-sm p-6 border hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold">Carrinho {numero}</h2>
              <p className="text-gray-500 mt-2">
                Clique para verificar os chromebooks
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}