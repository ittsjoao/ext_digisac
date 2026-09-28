import { api } from "@/lib/backend";

export interface HistoryItem {
  id: string;
  userId: string;
  userName: string;
  contactId: string;
  contactName: string;
  serviceId: string;
  departmentId: string;
  assignedUserId: string | null;
  gclickClientName: string | null;
  hadComment: boolean;
  createdAt: string;
}

export interface HistoryPage {
  items: HistoryItem[];
  total: number;
}

interface Named {
  id: string;
  name: string;
}

export interface Lookup {
  services: Map<string, string>;
  departments: Map<string, string>;
  users: Named[];
}

export function fetchHistory(page: number, userId: string | null): Promise<HistoryPage> {
  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (userId) params.set("userId", userId);
  return api<HistoryPage>("GET", `/history?${params.toString()}`);
}

/** Nomes de serviços, departamentos e usuários para exibir o histórico (o backend grava só os ids). */
export async function fetchLookup(): Promise<Lookup> {
  const c = await api<{ services: Named[]; departments: Named[]; users: Named[] }>("GET", "/catalog");
  return {
    services: new Map(c.services.map((s) => [s.id, s.name])),
    departments: new Map(c.departments.map((d) => [d.id, d.name])),
    users: [...c.users].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
