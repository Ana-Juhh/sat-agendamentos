"use client";

import { useRouter } from "next/navigation";
import HeaderDashboard from "@/components/HeaderDashboard";
import BackButton from "@/components/BackButton";

const opcoes = [
  { tipo: "carrinhos", emoji: "🛒", label: "Carrinhos de Chromebook" },
  { tipo: "lab",       emoji: "🔬", label: "Lab. de Ciências" },
  { tipo: "maker",     emoji: "🛠️",  label: "Sala Maker" },
  { tipo: "chromebooks", emoji: "💻", label: "Chromebooks" },
];

export default function EscolherTipoAgendamento() {
  const router = useRouter();

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-3xl mx-auto py-16 px-4">
        <BackButton href="/dashboard" />
        <h1 className="text-3xl font-bold text-center mb-10">
          O que você deseja agendar?
        </h1>

        <div className="grid grid-cols-2 gap-6">
          {opcoes.map(({ tipo, emoji, label }) => (
            <button
              key={tipo}
              onClick={() => router.push(`/agendamentos/novo/${tipo}`)}
              className="bg-white shadow-md rounded-2xl p-8 hover:scale-105 hover:shadow-xl transition-all text-center flex flex-col items-center gap-3"
            >
              <span className="text-5xl">{emoji}</span>
              <p className="text-lg font-semibold text-gray-700">{label}</p>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
