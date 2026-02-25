import { browser } from "wxt/browser";
import type { GClickClient } from "@/api/types";

const KEY_ENABLED = "gclick_enabled";
const KEY_CLIENTS = "gclick_clients";

export async function getGClickEnabled(): Promise<boolean> {
  const result = await browser.storage.local.get(KEY_ENABLED);
  return (result[KEY_ENABLED] as boolean) ?? false;
}

export async function setGClickEnabled(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [KEY_ENABLED]: enabled });
}

export async function getGClickClients(): Promise<GClickClient[] | null> {
  const result = await browser.storage.local.get(KEY_CLIENTS);
  return (result[KEY_CLIENTS] as GClickClient[]) ?? null;
}

export async function setGClickClients(
  clients: GClickClient[],
): Promise<void> {
  await browser.storage.local.set({ [KEY_CLIENTS]: clients });
}
