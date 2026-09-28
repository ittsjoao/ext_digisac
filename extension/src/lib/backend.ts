import { browser } from "wxt/browser";
import type { ApiMethod, ApiResult, ExtMessage, GClickCredentialsInput, SessionState } from "./messages";

export class ApiError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
  readonly status: number;

  constructor(code: string, message: string, details: Record<string, unknown> = {}, status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const EXTENSION_ERROR = "Não foi possível falar com a extensão. Recarregue a página.";

async function send<T>(message: ExtMessage): Promise<T> {
  let response: unknown;
  try {
    response = await browser.runtime.sendMessage(message);
  } catch {
    throw new ApiError("EXTENSION_ERROR", EXTENSION_ERROR);
  }
  if (response === undefined || response === null) throw new ApiError("EXTENSION_ERROR", EXTENSION_ERROR);
  return response as T;
}

function unwrap<T>(result: ApiResult<T>): T {
  if (result.ok) return result.data as T;
  throw new ApiError(result.code, result.message, result.details, result.status);
}

/** Chama o backend pelo background; 204 devolve null. Lança ApiError em qualquer falha. */
export async function api<T>(method: ApiMethod, path: string, body?: unknown): Promise<T> {
  return unwrap(await send<ApiResult<T>>({ type: "api", method, path, body }));
}

export function sessionGet(): Promise<SessionState> {
  return send<SessionState>({ type: "session:get" });
}

export async function sendBearer(bearer: string): Promise<void> {
  await send<unknown>({ type: "session:bearer", bearer });
}

export async function registerTenant(input: {
  name: string;
  digisacToken: string;
  gclick?: GClickCredentialsInput;
}): Promise<void> {
  unwrap(await send<ApiResult>({ type: "session:register", ...input }));
}

export async function updateCredentials(input: { digisacToken?: string; gclick?: GClickCredentialsInput }): Promise<void> {
  unwrap(await send<ApiResult>({ type: "session:credentials", ...input }));
}
