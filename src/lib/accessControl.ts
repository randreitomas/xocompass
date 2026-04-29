export type AppRole = "Admin" | "Manager" | "Analyst" | "Marketing";

export const ALL_ROLES: AppRole[] = ["Admin", "Manager", "Analyst", "Marketing"];

export const getStoredRole = (): AppRole | null => {
  const raw = localStorage.getItem("xocompass:userRole");
  if (!raw) return null;
  return ALL_ROLES.includes(raw as AppRole) ? (raw as AppRole) : null;
};

export const hasRoleAccess = (allowedRoles: AppRole[]): boolean => {
  const role = getStoredRole();
  return role != null && allowedRoles.includes(role);
};

