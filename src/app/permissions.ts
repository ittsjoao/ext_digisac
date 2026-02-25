import type { ServiceItem, DepartmentItem } from "@/api/types";
import { normalizeEmail } from "@/utils/normalize";
import deptPerms from "./department-permissions.json";
import { ADMIN_EMAILS } from "./config";

export interface DeptPermission {
  allowedServiceIds: string[];
  allowedDepartmentIds: string[];
}

export type DeptPermissions = Record<string, DeptPermission>;

export const defaultDeptPermissions: DeptPermissions = deptPerms;

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.some((e) => normalizeEmail(e) === normalizeEmail(email));
}

function getPermissionsForUser(
  userDepartmentNames: string[],
  permissions: DeptPermissions,
): DeptPermission {
  const merged: DeptPermission = {
    allowedServiceIds: [],
    allowedDepartmentIds: [],
  };

  for (const deptName of userDepartmentNames) {
    const perms = permissions[deptName];
    if (!perms) continue;

    if (perms.allowedServiceIds.includes("*")) {
      merged.allowedServiceIds = ["*"];
    } else if (!merged.allowedServiceIds.includes("*")) {
      merged.allowedServiceIds.push(...perms.allowedServiceIds);
    }

    if (perms.allowedDepartmentIds.includes("*")) {
      merged.allowedDepartmentIds = ["*"];
    } else if (!merged.allowedDepartmentIds.includes("*")) {
      merged.allowedDepartmentIds.push(...perms.allowedDepartmentIds);
    }
  }

  merged.allowedServiceIds = [...new Set(merged.allowedServiceIds)];
  merged.allowedDepartmentIds = [...new Set(merged.allowedDepartmentIds)];

  return merged;
}

export function getAllowedServices(
  email: string,
  userDepartmentNames: string[],
  services: ServiceItem[],
  permissions: DeptPermissions = defaultDeptPermissions,
): ServiceItem[] {
  if (isAdmin(email)) return services;

  const perms = getPermissionsForUser(userDepartmentNames, permissions);
  if (perms.allowedServiceIds.includes("*")) return services;
  if (perms.allowedServiceIds.length === 0) return [];

  return services.filter((s) => perms.allowedServiceIds.includes(s.id));
}

export function getAllowedDepartments(
  email: string,
  userDepartmentNames: string[],
  departments: DepartmentItem[],
  permissions: DeptPermissions = defaultDeptPermissions,
): DepartmentItem[] {
  if (isAdmin(email)) return departments;

  const perms = getPermissionsForUser(userDepartmentNames, permissions);
  if (perms.allowedDepartmentIds.includes("*")) return departments;
  if (perms.allowedDepartmentIds.length === 0) return [];

  return departments.filter((d) => perms.allowedDepartmentIds.includes(d.id));
}
