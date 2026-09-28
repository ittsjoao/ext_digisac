import { create } from "zustand";
import { toast } from "sonner";
import { ApiError, sessionGet } from "@/lib/backend";
import type { SessionState } from "@/lib/messages";
import { isSessionCode } from "@/lib/session-state";

interface SessionStore {
  state: SessionState | null;
  refresh: () => Promise<void>;
}

export const useSessionStore = create<SessionStore>((set) => ({
  state: null,
  refresh: async () => {
    try {
      set({ state: await sessionGet() });
    } catch (e) {
      set({
        state: {
          status: "error",
          code: e instanceof ApiError ? e.code : "EXTENSION_ERROR",
          message: e instanceof Error ? e.message : "Erro inesperado.",
        },
      });
    }
  },
}));

/** Erro de sessão refaz session:get (o modal troca de tela); o resto vira toast. */
export function reportError(e: unknown, fallback = "Erro inesperado."): void {
  if (e instanceof ApiError && isSessionCode(e.code)) {
    void useSessionStore.getState().refresh();
    return;
  }
  toast.error(e instanceof Error && e.message ? e.message : fallback);
}
