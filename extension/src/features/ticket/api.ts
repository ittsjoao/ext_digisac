import { api } from "@/lib/backend";
import type {
  Catalog,
  Contact,
  GClickClient,
  IndexProgress,
  OpenTicketInfo,
  OpenTicketInput,
  RegisterContactInput,
  RegisterResult,
} from "./types";

const q = encodeURIComponent;

export function fetchCatalog(): Promise<Catalog> {
  return api<Catalog>("GET", "/catalog");
}

export function fetchContacts(serviceId: string): Promise<Contact[]> {
  return api<Contact[]>("GET", `/contacts?serviceId=${q(serviceId)}`);
}

export function fetchOpenTicket(contactId: string): Promise<OpenTicketInfo | null> {
  return api<OpenTicketInfo | null>("GET", `/contacts/${q(contactId)}/open-ticket`);
}

export function registerContact(input: RegisterContactInput): Promise<RegisterResult> {
  return api<RegisterResult>("POST", "/contacts/register", input);
}

export function openTicket(input: OpenTicketInput): Promise<unknown> {
  return api<unknown>("POST", "/tickets", input);
}

export function searchCompanies(term: string): Promise<GClickClient[]> {
  return api<GClickClient[]>("GET", `/gclick/clients?q=${q(term)}`);
}

export function fetchIndexStatus(): Promise<IndexProgress> {
  return api<IndexProgress>("GET", "/gclick/index-status");
}
