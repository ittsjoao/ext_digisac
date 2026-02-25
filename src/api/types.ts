export interface Paginated<T> {
  data: T[];
  total: number;
  perPage: number;
  page: number;
  lastPage: number;
}

export interface UserLoginItem {
  name: string;
  email: string;
  departments: { name: string }[];
}

export interface UserFullItem {
  id: string;
  name: string;
  email: string;
  departments: { name: string }[];
}

export interface ServiceItem {
  id: string;
  name: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
}

export interface ContactTag {
  label: string;
}

export interface ContactData {
  number?: string;
  [key: string]: unknown;
}

export interface ContactItem {
  id: string;
  name: string;
  internalName: string | null;
  data: ContactData | null;
  tags: ContactTag[];
}

export interface TransferPayload {
  departmentId: string;
  userId?: string;
  comments?: string;
}

export interface GClickPhone {
  nome: string;
  numero: string;
}

export interface GClickClient {
  id: number;
  nome: string;
  inscricao: string;
  telefones: GClickPhone[];
}

export interface HistoryEntry {
  date: string;
  email: string;
  serviceId: string;
  serviceName: string;
  contactId: string;
  contactName: string;
  departmentId: string;
  departmentName: string;
  userId?: string;
  userName?: string;
  comments?: string;
}
