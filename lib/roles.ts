export type UserRole = "superadmin" | "admin" | "user";

/**
 * Normaliza o role vindo do banco
 * Mantém compatibilidade com valores atuais:
 * - superadmin
 * - admin
 * - professor
 * - estagiario_manha
 * - estagiario_tarde
 */
export function normalizeRole(role?: string | null): UserRole {
  if (role === "superadmin") return "superadmin";

  if (
    role === "admin" ||
    role === "professor" ||
    role === "estagiario_manha" ||
    role === "estagiario_tarde"
  ) {
    return "admin";
  }

  return "user";
}

/**
 * Permissões base
 */
export function isSuperAdmin(role?: string | null) {
  return normalizeRole(role) === "superadmin";
}

export function isAdmin(role?: string | null) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "superadmin";
}

/**
 * Agendamentos
 */
export function canViewAllAgendamentos(role?: string | null) {
  return isAdmin(role);
}

export function canEditAnyAgendamento(role?: string | null) {
  return isAdmin(role);
}

export function canCreateAgendamento(role?: string | null) {
  return true; // todos podem criar
}

export function canViewOwnAgendamentos(role?: string | null) {
  return true; // todos podem ver os próprios
}

/**
 * Equipamentos / Chromebooks
 */
export function canManageEquipamentos(role?: string | null) {
  return isAdmin(role);
}

/**
 * Checagem de carrinhos
 */
export function canCheckCarrinhos(role?: string | null) {
  return isAdmin(role);
}

/**
 * Agenda geral
 */
export function canViewAgendaGeral(role?: string | null) {
  return isAdmin(role);
}

/**
 * Relatórios (somente super admin)
 */
export function canViewAdminReports(role?: string | null) {
  return isSuperAdmin(role);
}

/**
 * QR Code / Scanner
 */
export function canUseQrScanner(role?: string | null) {
  return isSuperAdmin(role);
}

/**
 * Usuários e permissões
 */
export function canManageUsers(role?: string | null) {
  return isSuperAdmin(role);
}

/**
 * Exibir área administrativa
 */
export function shouldShowAdminArea(role?: string | null) {
  return isAdmin(role);
}

/**
 * Utilitário opcional para relatórios (turno dos estagiários)
 */
export function getUserShift(role?: string | null): "manha" | "tarde" | null {
  if (role === "estagiario_manha") return "manha";
  if (role === "estagiario_tarde") return "tarde";
  return null;
}