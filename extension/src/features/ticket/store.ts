import { create } from "zustand";
import type { Catalog, Contact, GClickClient } from "./types";

export interface TicketForm {
  serviceId: string | null;
  company: GClickClient | null;
  contactId: string | null;
  contactName: string | null;
  departmentId: string | null;
  userId: string | null;
  comment: string;
}

const EMPTY_FORM: TicketForm = {
  serviceId: null,
  company: null,
  contactId: null,
  contactName: null,
  departmentId: null,
  userId: null,
  comment: "",
};

interface TicketState {
  catalog: Catalog | null;
  catalogError: string | null;
  contactsByService: Record<string, Contact[]>;
  form: TicketForm;
  setCatalog: (catalog: Catalog | null, error: string | null) => void;
  setContacts: (serviceId: string, contacts: Contact[]) => void;
  setField: <K extends keyof TicketForm>(key: K, value: TicketForm[K]) => void;
  clearContact: () => void;
  clear: () => void;
}

export const useTicketStore = create<TicketState>((set) => ({
  catalog: null,
  catalogError: null,
  contactsByService: {},
  form: EMPTY_FORM,
  setCatalog: (catalog, catalogError) => set({ catalog, catalogError }),
  setContacts: (serviceId, contacts) =>
    set((s) => ({ contactsByService: { ...s.contactsByService, [serviceId]: contacts } })),
  setField: (key, value) => set((s) => ({ form: { ...s.form, [key]: value } })),
  clearContact: () => set((s) => ({ form: { ...s.form, contactId: null, contactName: null } })),
  clear: () => set({ catalog: null, catalogError: null, contactsByService: {}, form: EMPTY_FORM }),
}));
