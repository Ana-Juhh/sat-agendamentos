"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, PlusCircle } from "lucide-react";

import { pb } from "@/lib/pocketbase";
import ServiceCard from "@/components/ServiceCard";
import HeaderDashboard from "@/components/HeaderDashboard";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push("/login");
    }
  }, [router]);

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-5xl mx-auto py-16">
        <h2 className="text-3xl font-bold text-center mb-10">
          Escolha o serviço
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ServiceCard
            title="Meus agendamentos"
            icon={<CalendarDays size={48} />}
            href="/agendamentos/meus"
          />

          <ServiceCard
            title="Novo agendamento"
            icon={<PlusCircle size={48} />}
            href="/agendamentos/novo"
          />

          <ServiceCard
            title="Agenda geral"
            icon={<CalendarDays size={48} />}
            href="/agendamentos/agenda"
          />

          <ServiceCard
            title="Ler QR Code dos Chromebooks"
            icon={<span className="text-4xl">📷</span>} // Ou use um ícone da lucide-react como o 'QrCode'
            href="/dashboard/scanner"
          />

        </div>
      </div>
    </>
  );
}
