"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  PlusCircle,
  Wrench,
  Package2,
  ClipboardList,
  QrCode,
} from "lucide-react";

import { pb } from "@/lib/pocketbase";
import ServiceCard from "@/components/ServiceCard";
import HeaderDashboard from "@/components/HeaderDashboard";

export default function Dashboard() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }

    const model = pb.authStore.model as { role?: string } | null;
    setRole(model?.role || "");
    setMounted(true);
  }, [router]);

  if (!mounted) {
    return (
      <>
        <HeaderDashboard />
        <div className="max-w-5xl mx-auto py-16 text-center text-gray-500">
          Carregando...
        </div>
      </>
    );
  }

  const isAdmin = role === "admin";
  const isEstagiario = role.includes("estagiario");

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-5xl mx-auto py-16 px-4">
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

          {isAdmin ? (
            <ServiceCard
              title="Equipamentos"
              icon={<Wrench size={48} />}
              href="/admin/equipamentos"
            />
          ) : !isEstagiario ? (
            <ServiceCard
              title="Agenda geral"
              icon={<CalendarDays size={48} />}
              href="/agendamentos/agenda"
            />
          ) : null}

          {(isAdmin || isEstagiario) && (
            <ServiceCard
              title="Carrinhos"
              icon={<Package2 size={48} />}
              href="/checagem/carrinhos"
            />
          )}

          {isAdmin && (
            <ServiceCard
              title="Relatórios de checagem"
              icon={<ClipboardList size={48} />}
              href="/admin/checagens"
            />
          )}

          {isAdmin && (
            <ServiceCard
              title="Ler QR Code dos Chromebooks"
              icon={<QrCode size={48} />}
              href="/dashboard/scanner"
            />
          )}
        </div>
      </div>
    </>
  );
}