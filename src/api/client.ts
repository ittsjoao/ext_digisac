import { BASE_URL } from "@/app/config";
import { STORAGE_KEY_TOKEN } from "@/app/config";
import { logger } from "@/utils/logger";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = STORAGE_KEY_TOKEN;
  if (!token) throw new ApiError(401, "Token não configurado");

  const url = `${BASE_URL}/${path}`;
  logger.info(`API ${init?.method ?? "GET"} ${path}`);

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text as T;
  }
}
