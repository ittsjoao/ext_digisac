export interface Named {
  id: string;
  name: string;
}

export interface CatalogUser {
  id: string;
  name: string;
  email: string;
  departments: Named[];
}

export interface Catalog {
  services: Named[];
  departments: Named[];
  users: CatalogUser[];
}

export interface Contact {
  id: string;
  name: string;
  internalName: string | null;
  serviceId: string;
  number: string | null;
  tags: string[];
}

export interface OpenTicketInfo {
  userName: string;
  departmentName: string;
}

export interface RegisterResult {
  contactId: string;
  outcome: "CREATED" | "UPDATED";
}

export interface GClickPhone {
  nome: string;
  numero: string;
}

export interface GClickClient {
  id: number;
  nome: string;
  apelido: string;
  status: string;
  inscricao: string;
  telefones: GClickPhone[];
}

export interface IndexProgress {
  loaded: number;
  total: number;
  running: boolean;
  error: string | null;
}

export interface RegisterContactInput {
  serviceId: string;
  name: string;
  phone: string;
  departmentId: string | null;
}

export interface OpenTicketInput {
  serviceId: string;
  contactId: string;
  departmentId: string;
  userId: string | null;
  comment: string | null;
  gclickClientId: number | null;
}
