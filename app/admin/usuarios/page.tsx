"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Shield, Trash2, User, Users } from "lucide-react";

import HeaderDashboard from "@/components/HeaderDashboard";
import BackButton from "@/components/BackButton";
import { pb } from "@/lib/pocketbase";
import { isSuperAdmin } from "@/lib/roles";

type UserRecord = {
  id: string;
  name?: string;
  username?: string;
  email: string;
  role?: string;
};

const ROLE_OPTIONS = [
  "superadmin",
  "admin",
  "estagiario_manha",
  "estagiario_tarde",
  "user",
];

function getDisplayName(user: UserRecord) {
  return user.name || user.username || user.email;
}

function getInitials(user: UserRecord) {
  const name = getDisplayName(user).trim();
  const parts = name.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getRoleLabel(role?: string) {
  switch (role) {
    case "superadmin":
      return "Superadmin";
    case "admin":
      return "Admin";
    case "estagiario_manha":
      return "Estagiário manhã";
    case "estagiario_tarde":
      return "Estagiário tarde";
    default:
      return "Usuário";
  }
}

function getRoleBadgeClass(role?: string) {
  switch (role) {
    case "superadmin":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";

    case "admin":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";

    case "estagiario_manha":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200";

    case "estagiario_tarde":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}
export default function AdminUsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const currentUser = pb.authStore.model as
    | { id: string; role?: string }
    | null;

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }

    if (!isSuperAdmin(currentUser?.role)) {
      router.replace("/dashboard");
      return;
    }

    void loadUsers();
  }, [router, currentUser?.role]);

  async function loadUsers() {
    try {
      setLoading(true);

      const records = await pb.collection("users").getFullList<UserRecord>({
        sort: "email",
      });

      setUsers(records);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      alert("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      setSavingUserId(userId);

      await pb.collection("users").update(userId, {
        role: newRole,
      });

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      alert("Não foi possível atualizar o nível do usuário.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (userId === currentUser?.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este usuário?"
    );

    if (!confirmed) return;

    try {
      await pb.collection("users").delete(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      alert("Usuário excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      alert("Não foi possível excluir o usuário.");
    }
  }

  const stats = useMemo(() => {
    const total = users.length;
    const superadmins = users.filter((u) => u.role === "superadmin").length;
    const admins = users.filter((u) => u.role === "admin").length;
    const comuns = users.filter((u) => !u.role || u.role === "user").length;

    return { total, superadmins, admins, comuns };
  }, [users]);

  return (
    <>
      <HeaderDashboard />

      <main className="max-w-6xl mx-auto px-4 py-10 text-slate-900">
        <div className="mb-6">
          <BackButton href="/admin" />
        </div>

        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Área administrativa</p>
          <h1 className="text-3xl sm:text-4xl font-bold mt-1">
            Gerenciar usuários
          </h1>
          <p className="mt-2 text-slate-600">
            Usuários entram com a conta Google. Aqui você só controla as permissões.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <Users size={18} className="text-slate-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{stats.total}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Superadmins</span>
              <Crown size={18} className="text-amber-500" />
            </div>
            <p className="mt-3 text-3xl font-bold">{stats.superadmins}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Admins</span>
              <Shield size={18} className="text-blue-500" />
            </div>
            <p className="mt-3 text-3xl font-bold">{stats.admins}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Usuários</span>
              <User size={18} className="text-slate-500" />
            </div>
            <p className="mt-3 text-3xl font-bold">{stats.comuns}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-slate-500">Carregando usuários...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-medium">Nenhum usuário encontrado</p>
            <p className="mt-2 text-sm text-slate-500">
              Quando houver usuários cadastrados, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-6 py-4 text-sm font-semibold">Usuário</th>
                  <th className="px-6 py-4 text-sm font-semibold">E-mail</th>
                  <th className="px-6 py-4 text-sm font-semibold">Nível atual</th>
                  <th className="px-6 py-4 text-sm font-semibold">Permissão</th>
                  <th className="px-6 py-4 text-sm font-semibold text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-slate-200"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">
                            {getInitials(user)}
                          </div>
                          <div>
                            <p className="font-semibold">{getDisplayName(user)}</p>
                            {isCurrentUser && (
                              <p className="text-xs text-slate-500">Você</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-slate-700">
                        {user.email}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                            user.role
                          )}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <select
                          value={user.role || "user"}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value)
                          }
                          disabled={savingUserId === user.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 disabled:opacity-60"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isCurrentUser}
                          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-white font-medium transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}