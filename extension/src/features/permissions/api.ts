import { api } from "@/lib/backend";

export interface Named {
  id: string;
  name: string;
}

export interface Rule {
  departmentId: string;
  allServices: boolean;
  serviceIds: string[];
  allTargets: boolean;
  targetDepartmentIds: string[];
}

export interface PermissionsView {
  rules: Rule[];
  services: Named[];
  departments: Named[];
}

export function fetchPermissions(): Promise<PermissionsView> {
  return api<PermissionsView>("GET", "/permissions");
}

export function saveRule(rule: Rule): Promise<Rule> {
  const { departmentId, ...body } = rule;
  return api<Rule>("PUT", `/permissions/${encodeURIComponent(departmentId)}`, body);
}

export async function deleteRule(departmentId: string): Promise<void> {
  await api<null>("DELETE", `/permissions/${encodeURIComponent(departmentId)}`);
}
