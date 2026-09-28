export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface GClickCredentialsInput {
  clientId: string;
  clientSecret: string;
}

export type ExtMessage =
  | { type: "session:bearer"; bearer: string }
  | { type: "session:get" }
  | { type: "session:register"; name: string; digisacToken: string; gclick?: GClickCredentialsInput }
  | { type: "session:credentials"; digisacToken?: string; gclick?: GClickCredentialsInput }
  | { type: "api"; method: ApiMethod; path: string; body?: unknown };

export interface SessionUser {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface SessionTenant {
  name: string;
  gclickEnabled: boolean;
  validUntil: string | null;
}

export type SessionState =
  | { status: "ready"; user: SessionUser; tenant: SessionTenant }
  | { status: "waiting" }
  | { status: "error"; code: string; message: string; canRegister?: boolean; isAdmin?: boolean; contact?: string };

export type ApiResult<T = unknown> =
  | { ok: true; status: number; data: T | null }
  | { ok: false; status: number; code: string; message: string; details: Record<string, unknown> };
