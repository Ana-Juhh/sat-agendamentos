"use client";

import { useEffect, useSyncExternalStore } from "react";
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
import {
  canCheckCarrinhos,
  canManageEquipamentos,
  canUseQrScanner,
  canViewAdminReports,
  canViewAllAgendamentos,
} from "@/lib/roles";
import ServiceCard from "@/components/ServiceCard";
import HeaderDashboard from "@/components/HeaderDashboard";

function subscribe(callback: () => void) {
  return pb.authStore.onChange(() => {
    callback();
  });
}

function getRoleSnapshot() {
  const model = pb.authStore.model as { role?: string } | null;
  return model?.role || "";
}

export default function Dashboard() {
  const router = useRouter();
  const role = useSyncExternalStore(subscribe, getRoleSnapshot, () => "");

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.replace("/login");
    }
  }, [router]);

  const canManageAgenda = canViewAllAgendamentos(role);
  const canManageEquipments = canManageEquipamentos(role);
  const canDoCarrinhoCheck = canCheckCarrinhos(role);
  const canSeeReports = canViewAdminReports(role);
  const canSeeScanner = canUseQrScanner(role);

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-10">
          Escolha o servico
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

          {canManageAgenda && (
            <ServiceCard
              title="Agenda geral"
              icon={<CalendarDays size={48} />}
              href="/agendamentos/agenda"
            />
          )}

          {canManageEquipments && (
            <ServiceCard
              title="Equipamentos"
              icon={<Wrench size={48} />}
              href="/admin/equipamentos"
            />
          )}

          {canDoCarrinhoCheck && (
            <ServiceCard
              title="Carrinhos"
              icon={<Package2 size={48} />}
              href="/checagem/carrinhos"
            />
          )}

          {canSeeReports && (
            <ServiceCard
              title="Relatorios de checagem"
              icon={<ClipboardList size={48} />}
              href="/admin/checagens"
            />
          )}

          {canSeeScanner && (
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
