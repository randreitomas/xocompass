import type { AppRole } from "../types/roles";

const rank: Record<AppRole, number> = {
  VIEWER: 0,
  ANALYST: 1,
  ADMIN: 2,
};

/** True if `userRole` has at least the privileges of `required` (ADMIN ≥ ANALYST ≥ VIEWER). */
export function meetsMinimumRole(userRole: AppRole, required: AppRole): boolean {
  return rank[userRole] >= rank[required];
}

export function canUploadOrRetrain(role: AppRole | null): boolean {
  return role === "ADMIN" || role === "ANALYST";
}

export function canManageSaves(role: AppRole | null): boolean {
  return role === "ADMIN" || role === "ANALYST";
}
