export type UserRole = "superadmin" | "admin" | "professor" | "user";

export function normalizeRole(role?: string | null): UserRole {
  if (role === "superadmin") return "superadmin";
  if (role === "admin" || role?.startsWith("estagiario")) return "admin";
  if (role === "professor") return "professor";
  return "user";
}

export function canViewAllAgendamentos(role?: string | null) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "superadmin";
}

export function canManageEquipamentos(role?: string | null) {
  return canViewAllAgendamentos(role);
}

export function canCheckCarrinhos(role?: string | null) {
  return canViewAllAgendamentos(role);
}

export function canViewAdminReports(role?: string | null) {
  return normalizeRole(role) === "superadmin";
}

export function canUseQrScanner(role?: string | null) {
  return normalizeRole(role) === "superadmin";
}

export function shouldShowAdminArea(role?: string | null) {
  return canViewAllAgendamentos(role) || canViewAdminReports(role);
}
