import type { ApiMethod, ApiResult, ExtMessage, SessionState, SessionTenant, SessionUser } from "./messages.ts";

export interface StoredSession {
  bearer: string | null;
  token: string | null;
  expiresAt: number | null;
  user: SessionUser | null;
  tenant: SessionTenant | null;
}

export interface SessionStore {
  get(host: string): Promise<StoredSession | null>;
  set(host: string, value: StoredSession): Promise<void>;
}

export interface SessionManagerDeps {
  backendUrl: string;
  version: string;
  fetch: typeof fetch;
  store: SessionStore;
  now: () => number;
}

interface SessionResponse {
  token: string;
  expiresAt: string;
  user: SessionUser;
  tenant: SessionTenant;
}

type Failure = Extract<ApiResult, { ok: false }>;
type ErrorState = Extract<SessionState, { status: "error" }>;

const EMPTY: StoredSession = { bearer: null, token: null, expiresAt: null, user: null, tenant: null };
const EXPIRY_SKEW_MS = 30_000;
const NO_SESSION = "Sessão do DigiSac ainda não identificada. Recarregue a página.";
const OUTSIDE_DIGISAC = "Abra a extensão dentro do DigiSac.";

export function hostFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /^[a-z0-9-]+\.digisac\.co$/.test(host) ? host : null;
  } catch {
    return null;
  }
}

function failure(code: string, message: string, status = 0, details: Record<string, unknown> = {}): Failure {
  return { ok: false, status, code, message, details };
}

function sessionExtras(details: Record<string, unknown>): Pick<ErrorState, "canRegister" | "isAdmin" | "contact"> {
  const extras: Pick<ErrorState, "canRegister" | "isAdmin" | "contact"> = {};
  if (typeof details.canRegister === "boolean") extras.canRegister = details.canRegister;
  if (typeof details.isAdmin === "boolean") extras.isAdmin = details.isAdmin;
  if (typeof details.contact === "string") extras.contact = details.contact;
  return extras;
}

function toFailure(state: SessionState): Failure {
  if (state.status !== "error") return failure("UNAUTHENTICATED", NO_SESSION);
  const details: Record<string, unknown> = {};
  if (state.canRegister !== undefined) details.canRegister = state.canRegister;
  if (state.isAdmin !== undefined) details.isAdmin = state.isAdmin;
  if (state.contact !== undefined) details.contact = state.contact;
  return failure(state.code, state.message, 0, details);
}

export function createSessionManager(deps: SessionManagerDeps) {
  const base = deps.backendUrl.replace(/\/+$/, "");

  async function load(host: string): Promise<StoredSession> {
    return { ...EMPTY, ...((await deps.store.get(host)) ?? {}) };
  }

  async function call<T>(method: ApiMethod, path: string, body?: unknown, token?: string | null): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { "X-Ext-Version": deps.version };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let res: Response;
    try {
      res = await deps.fetch(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      return failure("NETWORK_ERROR", "Não foi possível falar com o servidor.");
    }
    const text = await res.text().catch(() => "");
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    if (res.ok) return { ok: true, status: res.status, data: parsed as T | null };
    const obj: Record<string, unknown> =
      parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const { code, message, ...details } = obj;
    return failure(
      typeof code === "string" ? code : `HTTP_${res.status}`,
      typeof message === "string" ? message : "Erro inesperado do servidor.",
      res.status,
      details,
    );
  }

  function isValid(s: StoredSession): boolean {
    return (
      !!s.token && s.expiresAt !== null && s.expiresAt - EXPIRY_SKEW_MS > deps.now() && s.user !== null && s.tenant !== null
    );
  }

  async function exchange(host: string, s: StoredSession): Promise<SessionState> {
    if (!s.bearer) return { status: "waiting" };
    const r = await call<SessionResponse>("POST", "/auth/session", { host, sessionBearer: s.bearer });
    if (!r.ok) return { status: "error", code: r.code, message: r.message, ...sessionExtras(r.details) };
    if (!r.data) return { status: "error", code: "UPSTREAM_ERROR", message: "Resposta vazia do servidor." };
    const d = r.data;
    await deps.store.set(host, {
      bearer: s.bearer,
      token: d.token,
      expiresAt: Date.parse(d.expiresAt),
      user: d.user,
      tenant: d.tenant,
    });
    return { status: "ready", user: d.user, tenant: d.tenant };
  }

  async function getSession(host: string): Promise<SessionState> {
    const s = await load(host);
    if (isValid(s)) return { status: "ready", user: s.user!, tenant: s.tenant! };
    return exchange(host, s);
  }

  async function setBearer(host: string, bearer: string): Promise<void> {
    const s = await load(host);
    if (s.bearer === bearer) return;
    await deps.store.set(host, { ...EMPTY, bearer });
  }

  async function authorizedCall(host: string, method: ApiMethod, path: string, body?: unknown): Promise<ApiResult> {
    const state = await getSession(host);
    if (state.status !== "ready") return toFailure(state);
    const s = await load(host);
    const r = await call(method, path, body, s.token);
    if (r.ok || r.status !== 401 || r.code !== "TOKEN_EXPIRED") return r;
    const renewed = await exchange(host, { ...s, token: null, expiresAt: null });
    if (renewed.status !== "ready") return toFailure(renewed);
    return call(method, path, body, (await load(host)).token);
  }

  async function withBearer(host: string, method: ApiMethod, path: string, payload: Record<string, unknown>): Promise<ApiResult> {
    const s = await load(host);
    if (!s.bearer) return toFailure({ status: "waiting" });
    const r = await call(method, path, { host, sessionBearer: s.bearer, ...payload });
    if (r.ok) await deps.store.set(host, { ...EMPTY, bearer: s.bearer });
    return r;
  }

  async function handle(message: ExtMessage, senderUrl: string | undefined): Promise<SessionState | ApiResult | { ok: true }> {
    const host = hostFromUrl(senderUrl);
    if (!host) {
      return message.type === "session:get"
        ? { status: "error", code: "INVALID_HOST", message: OUTSIDE_DIGISAC }
        : failure("INVALID_HOST", OUTSIDE_DIGISAC);
    }
    switch (message.type) {
      case "session:bearer":
        if (typeof message.bearer === "string" && message.bearer) await setBearer(host, message.bearer);
        return { ok: true };
      case "session:get":
        return getSession(host);
      case "session:register":
        return withBearer(host, "POST", "/tenants", {
          name: message.name,
          digisacToken: message.digisacToken,
          gclick: message.gclick,
        });
      case "session:credentials":
        return withBearer(host, "PUT", "/tenants/credentials", {
          digisacToken: message.digisacToken,
          gclick: message.gclick,
        });
      case "api":
        if (typeof message.path !== "string" || !message.path.startsWith("/") || message.path.startsWith("//")) {
          return failure("INVALID_PATH", "Caminho inválido.");
        }
        return authorizedCall(host, message.method, message.path, message.body);
    }
  }

  return { handle };
}
