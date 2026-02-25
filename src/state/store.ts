import { create } from "zustand";
import type {
  ServiceItem,
  DepartmentItem,
  UserFullItem,
  ContactItem,
  GClickClient,
} from "@/api/types";
import type { DeptPermissions } from "@/app/permissions";
import { defaultDeptPermissions } from "@/app/permissions";

interface AuthState {
  email: string | null;
  name: string | null;
  departmentNames: string[];
}

interface TicketFormState {
  selectedServiceId: string | null;
  selectedContactId: string | null;
  selectedContactName: string | null;
  selectedDepartmentId: string | null;
  selectedUserId: string | null;
  selectedGclickClientId: number | null;
  comments: string;
}

interface AppState {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  clearAuth: () => void;

  services: ServiceItem[];
  departments: DepartmentItem[];
  usersFull: UserFullItem[];
  contactsByService: Record<string, ContactItem[]>;
  setServices: (s: ServiceItem[]) => void;
  setDepartments: (d: DepartmentItem[]) => void;
  setUsersFull: (u: UserFullItem[]) => void;
  setContactsForService: (serviceId: string, contacts: ContactItem[]) => void;

  form: TicketFormState;
  setFormField: <K extends keyof TicketFormState>(
    key: K,
    value: TicketFormState[K]
  ) => void;
  resetForm: () => void;

  deptPermissions: DeptPermissions;
  setDeptPermissions: (p: DeptPermissions) => void;

  gclickEnabled: boolean;
  setGclickEnabled: (v: boolean) => void;
  gclickClients: GClickClient[];
  setGclickClients: (c: GClickClient[]) => void;

  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const initialAuth: AuthState = {
  email: null,
  name: null,
  departmentNames: [],
};

const initialForm: TicketFormState = {
  selectedServiceId: null,
  selectedContactId: null,
  selectedContactName: null,
  selectedDepartmentId: null,
  selectedUserId: null,
  selectedGclickClientId: null,
  comments: "",
};

export const useAppStore = create<AppState>((set) => ({
  auth: initialAuth,
  setAuth: (auth) => set({ auth }),
  clearAuth: () => set({ auth: initialAuth }),

  services: [],
  departments: [],
  usersFull: [],
  contactsByService: {},
  setServices: (services) => set({ services }),
  setDepartments: (departments) => set({ departments }),
  setUsersFull: (usersFull) => set({ usersFull }),
  setContactsForService: (serviceId, contacts) =>
    set((state) => ({
      contactsByService: { ...state.contactsByService, [serviceId]: contacts },
    })),

  form: initialForm,
  setFormField: (key, value) =>
    set((state) => ({ form: { ...state.form, [key]: value } })),
  resetForm: () => set({ form: initialForm }),

  deptPermissions: defaultDeptPermissions,
  setDeptPermissions: (deptPermissions) => set({ deptPermissions }),

  gclickEnabled: false,
  setGclickEnabled: (gclickEnabled) => set({ gclickEnabled }),
  gclickClients: [],
  setGclickClients: (gclickClients) => set({ gclickClients }),

  modalOpen: false,
  setModalOpen: (modalOpen) => set({ modalOpen }),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
