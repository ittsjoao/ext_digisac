import type { SessionState } from "./messages.ts";

export const SESSION_CODES: ReadonlySet<string> = new Set([
  "UNAUTHENTICATED",
  "TENANT_NOT_FOUND",
  "TENANT_PENDING",
  "TENANT_BLOCKED",
  "LICENSE_EXPIRED",
  "CREDENTIAL_INVALID",
  "EXTENSION_OUTDATED",
  "ACCOUNT_MISMATCH",
  "INVALID_HOST",
]);

export function isSessionCode(code: string): boolean {
  return SESSION_CODES.has(code);
}

// Sem resposta do backend (rede) ou proxy sem backend atrás (502/503/504 do Traefik).
const BACKEND_DOWN: ReadonlySet<string> = new Set(["NETWORK_ERROR", "HTTP_502", "HTTP_503", "HTTP_504"]);

export function isBackendDown(code: string): boolean {
  return BACKEND_DOWN.has(code);
}

export type SessionScreen =
  | { kind: "ready" }
  | { kind: "waiting" }
  | { kind: "register" }
  | { kind: "credentials" }
  | { kind: "message"; title: string; text: string; contact?: string; retry: boolean };

function message(title: string, text: string, contact?: string, retry = false): SessionScreen {
  return contact ? { kind: "message", title, text, contact, retry } : { kind: "message", title, text, retry };
}

/** `supportContact` vem do build: com o backend fora, o contato do servidor não chega. */
export function screenFor(state: SessionState, supportContact?: string): SessionScreen {
  if (state.status === "ready") return { kind: "ready" };
  if (state.status === "waiting") return { kind: "waiting" };
  if (isBackendDown(state.code)) {
    return message("Servidor em manutenção", "Por favor, aguarde.", state.contact ?? supportContact, true);
  }
  switch (state.code) {
    case "TENANT_NOT_FOUND":
      return state.canRegister
        ? { kind: "register" }
        : message("Empresa não cadastrada", "Peça ao administrador do DigiSac para cadastrar a empresa.");
    case "TENANT_PENDING":
      return message("Cadastro em análise", "O cadastro da empresa está aguardando liberação.", state.contact);
    case "TENANT_BLOCKED":
    case "LICENSE_EXPIRED":
      return message("Licença inativa", state.message, state.contact);
    case "CREDENTIAL_INVALID":
      return state.isAdmin
        ? { kind: "credentials" }
        : message("Credenciais da empresa inválidas", "Avise o administrador do DigiSac.");
    case "UNAUTHENTICATED":
    case "ACCOUNT_MISMATCH":
    case "INVALID_HOST":
      return message("Sessão do DigiSac expirada ou inválida", "Recarregue a página do DigiSac.");
    case "EXTENSION_OUTDATED":
      return message("Atualize a extensão", state.message);
    default:
      return message("Não foi possível carregar", state.message, undefined, true);
  }
}
