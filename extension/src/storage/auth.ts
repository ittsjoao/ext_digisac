import { browser } from "wxt/browser";

export interface AuthData {
  email: string;
  name: string;
  departmentNames: string[];
}

const STORAGE_KEY_AUTH = "digisac_auth";

export async function getAuth(): Promise<AuthData | null> {
  const result = await browser.storage.local.get(STORAGE_KEY_AUTH);
  return (result[STORAGE_KEY_AUTH] as AuthData) ?? null;
}

export async function setAuth(data: AuthData): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY_AUTH]: data });
}

export async function clearAuth(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY_AUTH);
}
