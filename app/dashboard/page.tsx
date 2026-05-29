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
  Users,
  LayoutDashboard,
  MonitorCheck,
} from "lucide-react";

import { pb } from "@/lib/pocketbase";
import {
  canCheckCarrinhos,
  canManageEquipamentos,
  canUseQrScanner,
  canViewAdminReports,
  canViewAllAgendamentos,
  isSuperAdmin,
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
  const canManageUsers = isSuperAdmin(role);

  const canSeeTvDashboards =
    canManageAgenda || canSeeReports || canManageUsers;

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

          <ServiceCard
            title={canManageAgenda ? "Agenda geral" : "Minha agenda"}
            icon={<CalendarDays size={48} />}
            href="/agendamentos/agenda"
          />

          {canSeeTvDashboards && (
            <>
              <ServiceCard
                title="Dashboard de tarefas"
                icon={<LayoutDashboard size={48} />}
                href="/dashboard/view"
              />

              <ServiceCard
                title="Dashboard de agendamentos"
                icon={<MonitorCheck size={48} />}
                href="/dashboard/agendamentos-tv"
              />
            </>
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
              title="Relatórios de checagem"
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

          {canManageUsers && (
            <ServiceCard
              title="Usuários"
              icon={<Users size={48} />}
              href="/admin/usuarios"
            />
          )}
        </div>
      </div>
    </>
  );
}