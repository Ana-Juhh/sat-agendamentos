"use client";

import { useEffect } from "react";
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
  const model = pb.authStore.model as { role?: string } | null;

  const role = model?.role || "";
  const isAdmin = role === "admin";
  const isEstagiario = role.includes("estagiario");

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

          {/* 👤 Usuário */}
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

          {/* 🔧 Admin */}
          {isAdmin && (
            <>
              <ServiceCard
                title="Equipamentos"
                icon={<Wrench size={48} />}
                href="/admin/equipamentos"
              />

              <ServiceCard
                title="Relatórios de checagem"
                icon={<ClipboardList size={48} />}
                href="/admin/checagens"
              />
            </>
          )}

          {/* 📦 Estagiário / Admin */}
          {(isAdmin || isEstagiario) && (
            <ServiceCard
              title="Carrinhos"
              icon={<Package2 size={48} />}
              href="/checagem/carrinhos"
            />
          )}

          {/* 📷 Scanner (deixa só admin se quiser) */}
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