"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderDashboard from "@/components/HeaderDashboard";
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

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

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

    loadUsers();
  }, [router]);

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

  async function handleCreateUser() {
    if (!newUser.name.trim()) {
      alert("Digite o nome do usuário.");
      return;
    }

    if (!newUser.email.trim()) {
      alert("Digite o e-mail do usuário.");
      return;
    }

    if (!newUser.password.trim()) {
      alert("Digite uma senha.");
      return;
    }

    if (newUser.password.length < 8) {
      alert("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    try {
      setCreating(true);

      await pb.collection("users").create({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        passwordConfirm: newUser.password,
        role: newUser.role,
      });

      alert("Usuário criado com sucesso!");

      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "user",
      });

      setShowCreate(false);
      await loadUsers();
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      alert("Não foi possível criar o usuário.");
    } finally {
      setCreating(false);
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

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold">Gerenciar usuários</h1>

          <button
            type="button"
            onClick={() => setShowCreate((prev) => !prev)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            {showCreate ? "Cancelar" : "Adicionar usuário"}
          </button>
        </div>

        {showCreate && (
          <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Novo usuário</h2>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Nome</label>
                <input
                  type="text"
                  placeholder="Nome do usuário"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="rounded-lg border px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">E-mail</label>
                <input
                  type="email"
                  placeholder="email@colegio.com"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="rounded-lg border px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Senha</label>
                <input
                  type="password"
                  placeholder="mínimo 8 caracteres"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="rounded-lg border px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Nível</label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))
                  }
                  className="rounded-lg border px-3 py-2"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={creating}
                className="rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Criando..." : "Criar usuário"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p>Carregando usuários...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Nível</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;

                  return (
                    <tr key={user.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        {user.name || user.username || user.email}
                      </td>

                      <td className="px-4 py-3">{user.email}</td>

                      <td className="px-4 py-3">
                        <select
                          value={user.role || "user"}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value)
                          }
                          disabled={savingUserId === user.id}
                          className="rounded-lg border px-3 py-2 disabled:opacity-60"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isCurrentUser}
                          className="rounded-lg bg-red-600 px-3 py-2 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            isCurrentUser
                              ? "Você não pode excluir seu próprio usuário"
                              : "Excluir usuário"
                          }
                        >
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
      </div>
    </>
  );
}